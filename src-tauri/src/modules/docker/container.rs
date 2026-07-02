use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::Emitter;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContainerInfo {
    pub id: String,
    pub name: String,
    pub image: String,
    pub status: String,
    pub state: String,
    pub ports: Vec<PortMapping>,
    pub created: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortMapping {
    pub host_port: u16,
    pub container_port: u16,
    pub protocol: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDatabaseContainerRequest {
    pub db_type: String,
    pub container_name: String,
    pub version: String,
    pub host_port: u16,
    pub root_password: String,
    pub database_name: String,
    pub username: String,
    pub password: String,
    pub data_volume: Option<String>,
    pub memory_limit: Option<String>,
    pub cpu_limit: Option<f32>,
    pub restart_policy: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateContainerResult {
    pub success: bool,
    pub container_id: Option<String>,
    pub container_name: String,
    pub connection_string: Option<String>,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub error: Option<String>,
}

fn docker_cmd(args: &[&str]) -> Result<String, String> {
    let output = Command::new("docker")
        .args(args)
        .output()
        .map_err(|e| format!("Failed to run docker: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

#[tauri::command]
pub async fn list_docker_containers(all: bool) -> Result<Vec<ContainerInfo>, String> {
    let mut args = vec![
        "ps",
        "--format",
        "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.State}}|{{.Ports}}|{{.CreatedAt}}",
    ];
    if all {
        args.push("-a");
    }

    let output = docker_cmd(&args)?;
    let containers = output
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|line| {
            let parts: Vec<&str> = line.splitn(7, '|').collect();
            ContainerInfo {
                id: parts.get(0).unwrap_or(&"").to_string(),
                name: parts.get(1).unwrap_or(&"").to_string(),
                image: parts.get(2).unwrap_or(&"").to_string(),
                status: parts.get(3).unwrap_or(&"").to_string(),
                state: parts.get(4).unwrap_or(&"").to_string(),
                ports: parse_ports(parts.get(5).unwrap_or(&"")),
                created: parts.get(6).unwrap_or(&"").to_string(),
            }
        })
        .collect();

    Ok(containers)
}

fn parse_ports(ports_str: &str) -> Vec<PortMapping> {
    ports_str
        .split(',')
        .filter_map(|p| {
            let p = p.trim();
            if p.is_empty() {
                return None;
            }
            if let Some(arrow_pos) = p.find("->") {
                let host_part = &p[..arrow_pos];
                let container_part = &p[arrow_pos + 2..];
                let host_port = host_part
                    .split(':')
                    .last()
                    .and_then(|p| p.parse().ok())
                    .unwrap_or(0);
                let (container_port, protocol) = if let Some(slash) = container_part.find('/') {
                    (
                        container_part[..slash].parse().unwrap_or(0),
                        container_part[slash + 1..].to_string(),
                    )
                } else {
                    (container_part.parse().unwrap_or(0), "tcp".to_string())
                };
                Some(PortMapping {
                    host_port,
                    container_port,
                    protocol,
                })
            } else {
                None
            }
        })
        .collect()
}

#[tauri::command]
pub async fn create_database_container(
    req: CreateDatabaseContainerRequest,
) -> Result<CreateContainerResult, String> {
    let existing = docker_cmd(&[
        "ps",
        "-a",
        "--filter",
        &format!("name={}", req.container_name),
        "--format",
        "{{.Names}}",
    ]);
    if let Ok(out) = existing {
        if !out.trim().is_empty() {
            return Ok(CreateContainerResult {
                success: false,
                container_id: None,
                container_name: req.container_name.clone(),
                connection_string: None,
                host: "localhost".to_string(),
                port: req.host_port,
                database: req.database_name.clone(),
                username: req.username.clone(),
                error: Some(format!("Container '{}' already exists", req.container_name)),
            });
        }
    }

    let mut run_args = vec!["run".to_string(), "-d".to_string()];

    run_args.push("--name".to_string());
    run_args.push(req.container_name.clone());

    run_args.push("--restart".to_string());
    run_args.push(req.restart_policy.clone());

    run_args.push("-p".to_string());
    run_args.push(format!("{}:{}", req.host_port, default_port(&req.db_type)));

    if let Some(ref mem) = req.memory_limit {
        run_args.push("--memory".to_string());
        run_args.push(mem.clone());
    }

    if let Some(cpu) = req.cpu_limit {
        run_args.push("--cpus".to_string());
        run_args.push(cpu.to_string());
    }

    let volume_name = req.data_volume.clone().unwrap_or_else(|| {
        format!("hive_{}_data", req.container_name)
    });

    run_args.push("-v".to_string());
    run_args.push(format!("{}:{}", volume_name, data_path(&req.db_type)));

    let env_vars = build_env_vars(&req);
    for env in &env_vars {
        run_args.push("-e".to_string());
        run_args.push(env.clone());
    }

    let image = format!("{}:{}", image_name(&req.db_type), req.version);
    run_args.push(image);

    let args_ref: Vec<&str> = run_args.iter().map(|s| s.as_str()).collect();
    let output = Command::new("docker")
        .args(&args_ref)
        .output()
        .map_err(|e| format!("Failed to run docker: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Ok(CreateContainerResult {
            success: false,
            container_id: None,
            container_name: req.container_name,
            connection_string: None,
            host: "localhost".to_string(),
            port: req.host_port,
            database: req.database_name,
            username: req.username,
            error: Some(stderr),
        });
    }

    let container_id = String::from_utf8_lossy(&output.stdout).trim()[..12].to_string();
    let conn_str = build_connection_string(&req);

    Ok(CreateContainerResult {
        success: true,
        container_id: Some(container_id),
        container_name: req.container_name,
        connection_string: Some(conn_str),
        host: "localhost".to_string(),
        port: req.host_port,
        database: req.database_name,
        username: req.username,
        error: None,
    })
}

fn build_env_vars(req: &CreateDatabaseContainerRequest) -> Vec<String> {
    match req.db_type.as_str() {
        "mysql" | "mariadb" => vec![
            format!("MYSQL_ROOT_PASSWORD={}", req.root_password),
            format!("MYSQL_DATABASE={}", req.database_name),
            format!("MYSQL_USER={}", req.username),
            format!("MYSQL_PASSWORD={}", req.password),
        ],
        "postgres" | "postgresql" => vec![
            format!("POSTGRES_DB={}", req.database_name),
            format!("POSTGRES_USER={}", req.username),
            format!("POSTGRES_PASSWORD={}", req.password),
        ],
        "mongodb" => vec![
            format!("MONGO_INITDB_ROOT_USERNAME={}", req.username),
            format!("MONGO_INITDB_ROOT_PASSWORD={}", req.root_password),
            format!("MONGO_INITDB_DATABASE={}", req.database_name),
        ],
        "redis" => {
            if !req.password.is_empty() {
                vec![format!("REDIS_PASSWORD={}", req.password)]
            } else {
                vec![]
            }
        }
        _ => vec![],
    }
}

fn build_connection_string(req: &CreateDatabaseContainerRequest) -> String {
    match req.db_type.as_str() {
        "mysql" | "mariadb" => format!(
            "mysql://{}:{}@localhost:{}/{}",
            req.username, req.password, req.host_port, req.database_name
        ),
        "postgres" | "postgresql" => format!(
            "postgresql://{}:{}@localhost:{}/{}",
            req.username, req.password, req.host_port, req.database_name
        ),
        "mongodb" => format!(
            "mongodb://{}:{}@localhost:{}/{}",
            req.username, req.root_password, req.host_port, req.database_name
        ),
        "redis" => {
            if req.password.is_empty() {
                format!("redis://localhost:{}", req.host_port)
            } else {
                format!("redis://:{}@localhost:{}", req.password, req.host_port)
            }
        }
        _ => format!("localhost:{}", req.host_port),
    }
}

fn image_name(db_type: &str) -> &str {
    match db_type {
        "mysql" => "mysql",
        "mariadb" => "mariadb",
        "postgres" | "postgresql" => "postgres",
        "mongodb" => "mongo",
        "redis" => "redis",
        _ => db_type,
    }
}

fn default_port(db_type: &str) -> u16 {
    match db_type {
        "mysql" | "mariadb" => 3306,
        "postgres" | "postgresql" => 5432,
        "mongodb" => 27017,
        "redis" => 6379,
        _ => 5432,
    }
}

fn data_path(db_type: &str) -> &str {
    match db_type {
        "mysql" | "mariadb" => "/var/lib/mysql",
        "postgres" | "postgresql" => "/var/lib/postgresql/data",
        "mongodb" => "/data/db",
        "redis" => "/data",
        _ => "/data",
    }
}

#[tauri::command]
pub async fn start_docker_container(container_name: String) -> Result<String, String> {
    docker_cmd(&["start", &container_name])
}

#[tauri::command]
pub async fn stop_docker_container(container_name: String) -> Result<String, String> {
    docker_cmd(&["stop", &container_name])
}

#[tauri::command]
pub async fn restart_docker_container(container_name: String) -> Result<String, String> {
    docker_cmd(&["restart", &container_name])
}

#[tauri::command]
pub async fn remove_docker_container(
    container_name: String,
    remove_volume: bool,
) -> Result<String, String> {
    let _ = docker_cmd(&["stop", &container_name]);
    let mut args = vec!["rm", "-f"];
    if remove_volume {
        args.push("-v");
    }
    args.push(&container_name);
    docker_cmd(&args)
}

#[tauri::command]
pub async fn get_container_logs(
    container_name: String,
    tail: Option<u32>,
) -> Result<Vec<String>, String> {
    let tail_str = tail.unwrap_or(100).to_string();
    let output = Command::new("docker")
        .args(["logs", "--tail", &tail_str, &container_name])
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let combined = format!("{}{}", stdout, stderr);
    Ok(combined.lines().map(|l| l.to_string()).collect())
}

#[tauri::command]
pub async fn get_container_stats(container_name: String) -> Result<serde_json::Value, String> {
    let output = Command::new("docker")
        .args([
            "stats",
            "--no-stream",
            "--format",
            r#"{"cpu":"{{.CPUPerc}}","memory":"{{.MemUsage}}","memperc":"{{.MemPerc}}","net":"{{.NetIO}}","block":"{{.BlockIO}}"}"#,
            &container_name,
        ])
        .output()
        .map_err(|e| e.to_string())?;

    let out = String::from_utf8_lossy(&output.stdout).trim().to_string();
    serde_json::from_str(&out).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pull_docker_image(
    image: String,
    tag: String,
    window: tauri::Window,
) -> Result<(), String> {
    let full_image = format!("{}:{}", image, tag);
    let _ = window.emit("docker-pull-log", format!("Pulling {}...", full_image));

    let output = Command::new("docker")
        .args(["pull", &full_image])
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    for line in stdout.lines() {
        let _ = window.emit("docker-pull-log", line.to_string());
    }

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub async fn list_docker_volumes() -> Result<Vec<serde_json::Value>, String> {
    let output = docker_cmd(&[
        "volume",
        "ls",
        "--format",
        "{{.Name}}|{{.Driver}}|{{.Mountpoint}}",
    ])?;

    let volumes = output
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|line| {
            let parts: Vec<&str> = line.splitn(3, '|').collect();
            serde_json::json!({
                "name": parts.get(0).unwrap_or(&""),
                "driver": parts.get(1).unwrap_or(&""),
                "mountpoint": parts.get(2).unwrap_or(&""),
            })
        })
        .collect();

    Ok(volumes)
}

#[tauri::command]
pub async fn remove_docker_volume(volume_name: String) -> Result<String, String> {
    docker_cmd(&["volume", "rm", &volume_name])
}

#[tauri::command]
pub async fn execute_sql_in_container(
    container_name: String,
    db_type: String,
    username: String,
    password: String,
    database: String,
    query: String,
) -> Result<String, String> {
    let cmd = match db_type.as_str() {
        "mysql" | "mariadb" => format!(
            "mysql -u{} -p{} {} -e '{}'",
            username, password, database, query
        ),
        "postgres" | "postgresql" => format!(
            "psql -U {} -d {} -c '{}'",
            username, database, query
        ),
        _ => return Err("Unsupported database type for SQL execution".to_string()),
    };

    let output = Command::new("docker")
        .args(["exec", &container_name, "sh", "-c", &cmd])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}