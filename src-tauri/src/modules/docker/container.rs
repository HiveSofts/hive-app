use super::models::*;
use std::collections::HashMap;
use std::process::Command;
use tauri::Emitter;
use crate::modules::docker::DockerInfo;

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
pub async fn inspect_container(container_name: String) -> Result<ContainerDetails, String> {
    let fmt = r#"{{.Id}}|||{{.Name}}|||{{.Config.Image}}|||{{.Image}}|||{{.State.Status}}|||{{.State.Status}}|||{{.Created}}|||{{.State.StartedAt}}|||{{.State.FinishedAt}}|||{{.RestartCount}}|||{{.HostConfig.RestartPolicy.Name}}|||{{.Platform}}|||{{.Config.Hostname}}|||{{.HostConfig.CpuShares}}|||{{.HostConfig.Memory}}|||{{.HostConfig.MemorySwap}}|||{{.Config.WorkingDir}}|||{{.Config.User}}|||{{.HostConfig.Privileged}}|||{{.State.Pid}}"#;

    let output = docker_cmd(&["inspect", "--format", fmt, &container_name])?;

    let parts: Vec<&str> = output.splitn(20, "|||").collect();

    let id = parts
        .get(0)
        .unwrap_or(&"")
        .trim_start_matches('/')
        .to_string();
    let name = parts
        .get(1)
        .unwrap_or(&"")
        .trim_start_matches('/')
        .to_string();

    let ip_address = docker_cmd(&[
        "inspect",
        "--format",
        r#"{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}"#,
        &container_name,
    ])
    .unwrap_or_default()
    .trim()
    .to_string();

    let env_output = docker_cmd(&[
        "inspect",
        "--format",
        "{{range .Config.Env}}{{.}}\n{{end}}",
        &container_name,
    ])
    .unwrap_or_default();
    let env_vars: Vec<String> = env_output
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|l| l.to_string())
        .collect();

    let mounts_output = docker_cmd(&[
        "inspect",
        "--format",
        "{{range .Mounts}}{{.Type}}|{{.Source}}|{{.Destination}}|{{.Mode}}|{{.RW}}\n{{end}}",
        &container_name,
    ])
    .unwrap_or_default();
    let mounts: Vec<MountInfo> = mounts_output
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|line| {
            let p: Vec<&str> = line.splitn(5, '|').collect();
            MountInfo {
                mount_type: p.get(0).unwrap_or(&"").to_string(),
                source: p.get(1).unwrap_or(&"").to_string(),
                destination: p.get(2).unwrap_or(&"").to_string(),
                mode: p.get(3).unwrap_or(&"").to_string(),
                rw: p.get(4).unwrap_or(&"false") == &"true",
            }
        })
        .collect();

    let networks_output = docker_cmd(&[
        "inspect",
        "--format",
        "{{range $k,$v := .NetworkSettings.Networks}}{{$k}}|{{$v.IPAddress}}|{{$v.MacAddress}}|{{$v.Gateway}}\n{{end}}",
        &container_name,
    ])
    .unwrap_or_default();
    let networks: Vec<NetworkInfo> = networks_output
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|line| {
            let p: Vec<&str> = line.splitn(4, '|').collect();
            NetworkInfo {
                name: p.get(0).unwrap_or(&"").to_string(),
                ip_address: p.get(1).unwrap_or(&"").to_string(),
                mac_address: p.get(2).unwrap_or(&"").to_string(),
                gateway: p.get(3).unwrap_or(&"").to_string(),
            }
        })
        .collect();

    let labels_output = docker_cmd(&[
        "inspect",
        "--format",
        "{{range $k,$v := .Config.Labels}}{{$k}}={{$v}}\n{{end}}",
        &container_name,
    ])
    .unwrap_or_default();
    let labels: Vec<LabelEntry> = labels_output
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|line| {
            if let Some(eq) = line.find('=') {
                LabelEntry {
                    key: line[..eq].to_string(),
                    value: line[eq + 1..].to_string(),
                }
            } else {
                LabelEntry {
                    key: line.to_string(),
                    value: String::new(),
                }
            }
        })
        .collect();

    let ports_output = docker_cmd(&[
        "inspect",
        "--format",
        "{{range $p,$b := .NetworkSettings.Ports}}{{if $b}}{{range $b}}{{.HostPort}}|{{$p}}\n{{end}}{{end}}{{end}}",
        &container_name,
    ])
    .unwrap_or_default();
    let ports: Vec<PortMapping> = ports_output
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|line| {
            let p: Vec<&str> = line.splitn(2, '|').collect();
            let host_port: u16 = p.get(0).unwrap_or(&"0").parse().unwrap_or(0);
            let container_spec = p.get(1).unwrap_or(&"0/tcp");
            let (container_port, protocol) = if let Some(slash) = container_spec.find('/') {
                (
                    container_spec[..slash].parse().unwrap_or(0u16),
                    container_spec[slash + 1..].to_string(),
                )
            } else {
                (container_spec.parse().unwrap_or(0u16), "tcp".to_string())
            };
            PortMapping {
                host_port,
                container_port,
                protocol,
            }
        })
        .collect();

    let cmd_output = docker_cmd(&[
        "inspect",
        "--format",
        "{{range .Config.Cmd}}{{.}}\n{{end}}",
        &container_name,
    ])
    .unwrap_or_default();
    let cmd: Vec<String> = cmd_output
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|l| l.to_string())
        .collect();

    let ep_output = docker_cmd(&[
        "inspect",
        "--format",
        "{{range .Config.Entrypoint}}{{.}}\n{{end}}",
        &container_name,
    ])
    .unwrap_or_default();
    let entrypoint: Vec<String> = ep_output
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|l| l.to_string())
        .collect();

    Ok(ContainerDetails {
        id: id[..12.min(id.len())].to_string(),
        name,
        image: parts.get(2).unwrap_or(&"").to_string(),
        image_id: parts.get(3).unwrap_or(&"").to_string(),
        status: parts.get(4).unwrap_or(&"").to_string(),
        state: parts.get(5).unwrap_or(&"").to_string(),
        created: parts.get(6).unwrap_or(&"").to_string(),
        started_at: parts.get(7).unwrap_or(&"").to_string(),
        finished_at: parts.get(8).unwrap_or(&"").to_string(),
        restart_count: parts.get(9).unwrap_or(&"0").parse().unwrap_or(0),
        restart_policy: parts.get(10).unwrap_or(&"").to_string(),
        platform: parts.get(11).unwrap_or(&"").to_string(),
        hostname: parts.get(12).unwrap_or(&"").to_string(),
        ip_address,
        cpu_shares: parts.get(13).unwrap_or(&"0").parse().unwrap_or(0),
        memory_limit: parts.get(14).unwrap_or(&"0").parse().unwrap_or(0),
        memory_swap: parts.get(15).unwrap_or(&"0").parse().unwrap_or(0),
        working_dir: parts.get(16).unwrap_or(&"").to_string(),
        user: parts.get(17).unwrap_or(&"").to_string(),
        privileged: parts.get(18).unwrap_or(&"false") == &"true",
        pid: parts.get(19).unwrap_or(&"0").parse().unwrap_or(0),
        size_rw: None,
        size_root_fs: None,
        env_vars,
        labels,
        mounts,
        networks,
        ports,
        cmd,
        entrypoint,
    })
}

#[tauri::command]
pub async fn get_container_processes(
    container_name: String,
) -> Result<Vec<ContainerProcess>, String> {
    let output = Command::new("docker")
        .args([
            "top",
            &container_name,
            "-eo",
            "pid,ppid,user,pcpu,pmem,vsz,rss,tty,stat,start,time,cmd",
        ])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let mut lines = stdout.lines();
    lines.next();

    let procs = lines
        .filter(|l| !l.trim().is_empty())
        .map(|line| {
            let parts: Vec<&str> = line.splitn(12, ' ').filter(|s| !s.is_empty()).collect();
            ContainerProcess {
                pid: parts.get(0).unwrap_or(&"").to_string(),
                ppid: parts.get(1).unwrap_or(&"").to_string(),
                user: parts.get(2).unwrap_or(&"").to_string(),
                cpu: parts.get(3).unwrap_or(&"").to_string(),
                mem: parts.get(4).unwrap_or(&"").to_string(),
                vsz: parts.get(5).unwrap_or(&"").to_string(),
                rss: parts.get(6).unwrap_or(&"").to_string(),
                tty: parts.get(7).unwrap_or(&"").to_string(),
                stat: parts.get(8).unwrap_or(&"").to_string(),
                start: parts.get(9).unwrap_or(&"").to_string(),
                time: parts.get(10).unwrap_or(&"").to_string(),
                cmd: parts.get(11).unwrap_or(&"").to_string(),
            }
        })
        .collect();

    Ok(procs)
}

#[tauri::command]
pub async fn pause_container(container_name: String) -> Result<String, String> {
    docker_cmd(&["pause", &container_name])
}

#[tauri::command]
pub async fn unpause_container(container_name: String) -> Result<String, String> {
    docker_cmd(&["unpause", &container_name])
}

#[tauri::command]
pub async fn rename_container(old_name: String, new_name: String) -> Result<String, String> {
    docker_cmd(&["rename", &old_name, &new_name])
}

#[tauri::command]
pub async fn update_container(
    container_name: String,
    memory_limit: Option<String>,
    cpu_shares: Option<u64>,
    restart_policy: Option<String>,
) -> Result<String, String> {
    let mut args = vec!["update".to_string()];

    if let Some(mem) = memory_limit {
        args.push("--memory".to_string());
        args.push(mem);
        args.push("--memory-swap".to_string());
        args.push("-1".to_string());
    }

    if let Some(cpu) = cpu_shares {
        args.push("--cpu-shares".to_string());
        args.push(cpu.to_string());
    }

    if let Some(policy) = restart_policy {
        args.push("--restart".to_string());
        args.push(policy);
    }

    args.push(container_name);

    let args_ref: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    docker_cmd(&args_ref)
}

#[tauri::command]
pub async fn commit_container(
    container_name: String,
    repo: String,
    tag: String,
    message: String,
) -> Result<String, String> {
    let image_ref = format!("{}:{}", repo, tag);
    if message.is_empty() {
        docker_cmd(&["commit", &container_name, &image_ref])
    } else {
        docker_cmd(&["commit", "-m", &message, &container_name, &image_ref])
    }
}

#[tauri::command]
pub async fn export_container(
    container_name: String,
    output_path: String,
) -> Result<String, String> {
    let output = Command::new("docker")
        .args(["export", "-o", &output_path, &container_name])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(format!("Exported to {}", output_path))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub async fn copy_from_container(
    container_name: String,
    container_path: String,
    host_path: String,
) -> Result<String, String> {
    let src = format!("{}:{}", container_name, container_path);
    docker_cmd(&["cp", &src, &host_path])
}

#[tauri::command]
pub async fn copy_to_container(
    container_name: String,
    host_path: String,
    container_path: String,
) -> Result<String, String> {
    let dst = format!("{}:{}", container_name, container_path);
    docker_cmd(&["cp", &host_path, &dst])
}

#[tauri::command]
pub async fn kill_container(container_name: String, signal: String) -> Result<String, String> {
    let sig = if signal.is_empty() {
        "SIGKILL".to_string()
    } else {
        signal
    };
    docker_cmd(&["kill", "-s", &sig, &container_name])
}

#[tauri::command]
pub async fn list_images() -> Result<Vec<ImageInfo>, String> {
    let output = docker_cmd(&[
        "images",
        "--format",
        "{{.ID}}|{{.Repository}}|{{.Tag}}|{{.CreatedSince}}|{{.Size}}|{{.Digest}}",
    ])?;

    let images = output
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|line| {
            let p: Vec<&str> = line.splitn(6, '|').collect();
            ImageInfo {
                id: p.get(0).unwrap_or(&"").to_string(),
                repository: p.get(1).unwrap_or(&"").to_string(),
                tag: p.get(2).unwrap_or(&"").to_string(),
                created: p.get(3).unwrap_or(&"").to_string(),
                size: p.get(4).unwrap_or(&"").to_string(),
                digest: p.get(5).unwrap_or(&"").to_string(),
            }
        })
        .collect();

    Ok(images)
}

#[tauri::command]
pub async fn remove_image(image_id: String, force: bool) -> Result<String, String> {
    if force {
        docker_cmd(&["rmi", "-f", &image_id])
    } else {
        docker_cmd(&["rmi", &image_id])
    }
}

#[tauri::command]
pub async fn prune_images() -> Result<String, String> {
    docker_cmd(&["image", "prune", "-f"])
}

#[tauri::command]
pub async fn prune_containers() -> Result<String, String> {
    docker_cmd(&["container", "prune", "-f"])
}

#[tauri::command]
pub async fn prune_volumes() -> Result<String, String> {
    docker_cmd(&["volume", "prune", "-f"])
}

#[tauri::command]
pub async fn prune_system() -> Result<String, String> {
    docker_cmd(&["system", "prune", "-f", "--volumes"])
}

#[tauri::command]
pub async fn get_docker_system_info() -> Result<SystemInfo, String> {
    let output = Command::new("docker")
        .args([
            "system",
            "info",
            "--format",
            r#"{{.Containers}}|{{.ContainersRunning}}|{{.ContainersPaused}}|{{.ContainersStopped}}|{{.Images}}|{{.ServerVersion}}|{{.Driver}}|{{.MemTotal}}|{{.NCPU}}|{{.OperatingSystem}}|{{.KernelVersion}}|{{.Architecture}}"#,
        ])
        .output()
        .map_err(|e| e.to_string())?;

    let out = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let p: Vec<&str> = out.splitn(12, '|').collect();

    let du_output = Command::new("docker")
        .args([
            "system",
            "df",
            "--format",
            "{{.Type}}|{{.Size}}|{{.Reclaimable}}",
        ])
        .output()
        .map_err(|e| e.to_string())?;
    let du_str = String::from_utf8_lossy(&du_output.stdout).to_string();

    let mut img_size = String::from("0B");
    let mut cont_size = String::from("0B");
    let mut vol_size = String::from("0B");

    for line in du_str.lines() {
        let dp: Vec<&str> = line.splitn(3, '|').collect();
        match dp.get(0).unwrap_or(&"") {
            &"Images" => img_size = dp.get(1).unwrap_or(&"0B").to_string(),
            &"Containers" => cont_size = dp.get(1).unwrap_or(&"0B").to_string(),
            &"Local Volumes" => vol_size = dp.get(1).unwrap_or(&"0B").to_string(),
            _ => {}
        }
    }

    Ok(SystemInfo {
        containers_total: p.get(0).unwrap_or(&"0").parse().unwrap_or(0),
        containers_running: p.get(1).unwrap_or(&"0").parse().unwrap_or(0),
        containers_paused: p.get(2).unwrap_or(&"0").parse().unwrap_or(0),
        containers_stopped: p.get(3).unwrap_or(&"0").parse().unwrap_or(0),
        images: p.get(4).unwrap_or(&"0").parse().unwrap_or(0),
        server_version: p.get(5).unwrap_or(&"").to_string(),
        storage_driver: p.get(6).unwrap_or(&"").to_string(),
        memory_total: p.get(7).unwrap_or(&"0").parse().unwrap_or(0),
        cpus: p.get(8).unwrap_or(&"0").parse().unwrap_or(0),
        os: p.get(9).unwrap_or(&"").to_string(),
        kernel_version: p.get(10).unwrap_or(&"").to_string(),
        architecture: p.get(11).unwrap_or(&"").to_string(),
        disk_usage_images: img_size,
        disk_usage_containers: cont_size,
        disk_usage_volumes: vol_size,
    })
}

#[tauri::command]
pub async fn list_networks() -> Result<Vec<NetworkDetail>, String> {
    let output = docker_cmd(&[
        "network",
        "ls",
        "--format",
        "{{.ID}}|{{.Name}}|{{.Driver}}|{{.Scope}}",
    ])?;

    let mut networks = Vec::new();
    for line in output.lines().filter(|l| !l.trim().is_empty()) {
        let p: Vec<&str> = line.splitn(4, '|').collect();
        let id = p.get(0).unwrap_or(&"").to_string();

        let inspect_out = docker_cmd(&[
            "network",
            "inspect",
            "--format",
            "{{range .IPAM.Config}}{{.Subnet}}|{{.Gateway}}{{end}}|||{{len .Containers}}|||{{.Internal}}|||{{.Attachable}}",
            &id,
        ])
        .unwrap_or_default();

        let parts: Vec<&str> = inspect_out.splitn(4, "|||").collect();
        let ip_parts: Vec<&str> = parts.get(0).unwrap_or(&"").splitn(2, '|').collect();

        networks.push(NetworkDetail {
            id: id[..12.min(id.len())].to_string(),
            name: p.get(1).unwrap_or(&"").to_string(),
            driver: p.get(2).unwrap_or(&"").to_string(),
            scope: p.get(3).unwrap_or(&"").to_string(),
            ipam_subnet: ip_parts.get(0).unwrap_or(&"").to_string(),
            ipam_gateway: ip_parts.get(1).unwrap_or(&"").to_string(),
            containers_count: parts.get(1).unwrap_or(&"0").trim().parse().unwrap_or(0),
            internal: parts.get(2).unwrap_or(&"false").trim() == "true",
            attachable: parts.get(3).unwrap_or(&"false").trim() == "true",
        });
    }

    Ok(networks)
}

#[tauri::command]
pub async fn create_network(
    name: String,
    driver: String,
    subnet: Option<String>,
    gateway: Option<String>,
) -> Result<String, String> {
    let mut args = vec!["network".to_string(), "create".to_string()];
    args.push("--driver".to_string());
    args.push(driver);

    if let Some(s) = subnet {
        args.push("--subnet".to_string());
        args.push(s);
    }
    if let Some(g) = gateway {
        args.push("--gateway".to_string());
        args.push(g);
    }

    args.push(name);
    let args_ref: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    docker_cmd(&args_ref)
}

#[tauri::command]
pub async fn remove_network(network_id: String) -> Result<String, String> {
    docker_cmd(&["network", "rm", &network_id])
}

#[tauri::command]
pub async fn connect_container_to_network(
    container_name: String,
    network_name: String,
) -> Result<String, String> {
    docker_cmd(&["network", "connect", &network_name, &container_name])
}

#[tauri::command]
pub async fn disconnect_container_from_network(
    container_name: String,
    network_name: String,
) -> Result<String, String> {
    docker_cmd(&["network", "disconnect", &network_name, &container_name])
}

#[tauri::command]
pub async fn list_docker_volumes_detailed() -> Result<Vec<VolumeInfo>, String> {
    let output = docker_cmd(&[
        "volume",
        "ls",
        "--format",
        "{{.Name}}|{{.Driver}}|{{.Mountpoint}}",
    ])?;

    let mut volumes = Vec::new();
    for line in output.lines().filter(|l| !l.trim().is_empty()) {
        let p: Vec<&str> = line.splitn(3, '|').collect();
        let name = p.get(0).unwrap_or(&"").to_string();

        let created = docker_cmd(&["volume", "inspect", "--format", "{{.CreatedAt}}", &name])
            .unwrap_or_default();

        let containers_using: Vec<String> = {
            let c_out = docker_cmd(&[
                "ps",
                "-a",
                "--filter",
                &format!("volume={}", name),
                "--format",
                "{{.Names}}",
            ])
            .unwrap_or_default();
            c_out
                .lines()
                .filter(|l| !l.trim().is_empty())
                .map(|l| l.to_string())
                .collect()
        };

        volumes.push(VolumeInfo {
            name,
            driver: p.get(1).unwrap_or(&"").to_string(),
            mountpoint: p.get(2).unwrap_or(&"").to_string(),
            created: created.trim().to_string(),
            size: "N/A".to_string(),
            containers: containers_using,
        });
    }

    Ok(volumes)
}

#[tauri::command]
pub async fn create_volume(name: String, driver: String) -> Result<String, String> {
    docker_cmd(&["volume", "create", "--driver", &driver, &name])
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

    let volume_name = req
        .data_volume
        .clone()
        .unwrap_or_else(|| format!("hive_{}_data", req.container_name));
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

    let container_id = String::from_utf8_lossy(&output.stdout).trim()
        [..12.min(String::from_utf8_lossy(&output.stdout).trim().len())]
        .to_string();
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
    let tail_str = tail.unwrap_or(200).to_string();
    let output = Command::new("docker")
        .args(["logs", "--tail", &tail_str, "--timestamps", &container_name])
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let combined = format!("{}{}", stdout, stderr);
    Ok(combined.lines().map(|l| l.to_string()).collect())
}

#[tauri::command]
pub async fn get_container_stats(container_name: String) -> Result<ContainerStats, String> {
    let output = Command::new("docker")
        .args([
            "stats",
            "--no-stream",
            "--format",
            r#"{{.CPUPerc}}|||{{.MemUsage}}|||{{.MemPerc}}|||{{.NetIO}}|||{{.BlockIO}}|||{{.PIDs}}"#,
            &container_name,
        ])
        .output()
        .map_err(|e| e.to_string())?;

    let out = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let parts: Vec<&str> = out.splitn(6, "|||").collect();

    let cpu_str = parts.get(0).unwrap_or(&"0%").trim_end_matches('%');
    let cpu_raw: f64 = cpu_str.parse().unwrap_or(0.0);

    let mem_usage = parts.get(1).unwrap_or(&"0MiB / 0GiB").to_string();
    let mem_parts: Vec<&str> = mem_usage.split(" / ").collect();
    let mem_used_mb = parse_mem_to_mb(mem_parts.get(0).unwrap_or(&"0MiB"));
    let mem_limit_mb = parse_mem_to_mb(mem_parts.get(1).unwrap_or(&"0GiB"));

    Ok(ContainerStats {
        cpu: parts.get(0).unwrap_or(&"0%").to_string(),
        memory: parts.get(1).unwrap_or(&"").to_string(),
        memperc: parts.get(2).unwrap_or(&"0%").to_string(),
        net: parts.get(3).unwrap_or(&"").to_string(),
        block: parts.get(4).unwrap_or(&"").to_string(),
        pids: parts.get(5).unwrap_or(&"0").to_string(),
        cpu_raw,
        mem_used_mb,
        mem_limit_mb,
    })
}

fn parse_mem_to_mb(s: &str) -> f64 {
    let s = s.trim();
    if s.ends_with("GiB") {
        s.trim_end_matches("GiB")
            .trim()
            .parse::<f64>()
            .unwrap_or(0.0)
            * 1024.0
    } else if s.ends_with("MiB") {
        s.trim_end_matches("MiB")
            .trim()
            .parse::<f64>()
            .unwrap_or(0.0)
    } else if s.ends_with("kB") || s.ends_with("KiB") {
        s.trim_end_matches("kB")
            .trim_end_matches("KiB")
            .trim()
            .parse::<f64>()
            .unwrap_or(0.0)
            / 1024.0
    } else {
        0.0
    }
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
        "postgres" | "postgresql" => format!("psql -U {} -d {} -c '{}'", username, database, query),
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

#[tauri::command]
pub async fn run_docker_compose(
    project_name: String,
    compose_content: String,
    env_vars: HashMap<String, String>,
    window: tauri::Window,
) -> Result<(), String> {
    let tmp_dir = std::env::temp_dir().join(format!("hive_compose_{}", project_name));
    std::fs::create_dir_all(&tmp_dir).map_err(|e| e.to_string())?;
    let compose_file = tmp_dir.join("docker-compose.yml");
    std::fs::write(&compose_file, compose_content).map_err(|e| e.to_string())?;

    let env_file_content: String = env_vars
        .iter()
        .map(|(k, v)| format!("{}={}", k, v))
        .collect::<Vec<_>>()
        .join("\n");
    std::fs::write(tmp_dir.join(".env"), env_file_content).map_err(|e| e.to_string())?;

    let _ = window.emit("compose-log", format!("Starting project: {}", project_name));

    let output = Command::new("docker")
        .args([
            "compose",
            "-p",
            &project_name,
            "-f",
            compose_file.to_str().unwrap_or(""),
            "up",
            "-d",
        ])
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    for line in stdout.lines().chain(stderr.lines()) {
        let _ = window.emit("compose-log", line.to_string());
    }

    if output.status.success() {
        Ok(())
    } else {
        Err(stderr)
    }
}

#[tauri::command]
pub async fn stop_docker_compose(project_name: String) -> Result<(), String> {
    let tmp_dir = std::env::temp_dir().join(format!("hive_compose_{}", project_name));
    let compose_file = tmp_dir.join("docker-compose.yml");

    let output = Command::new("docker")
        .args([
            "compose",
            "-p",
            &project_name,
            "-f",
            compose_file.to_str().unwrap_or(""),
            "down",
        ])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub async fn list_compose_projects() -> Result<Vec<serde_json::Value>, String> {
    let output = docker_cmd(&["compose", "ls", "--format", "json"]).unwrap_or_default();
    serde_json::from_str::<Vec<serde_json::Value>>(&output).or_else(|_| Ok(vec![]))
}

#[tauri::command]
pub async fn backup_database_container(
    container_name: String,
    db_type: String,
    username: String,
    password: String,
    database: String,
    output_path: String,
) -> Result<String, String> {
    let cmd = match db_type.as_str() {
        "mysql" | "mariadb" => format!(
            "mysqldump -u{} -p{} {} > /tmp/backup.sql && cat /tmp/backup.sql",
            username, password, database
        ),
        "postgres" | "postgresql" => format!("pg_dump -U {} {}", username, database),
        "mongodb" => format!(
            "mongodump --username {} --password {} --db {} --archive --gzip",
            username, password, database
        ),
        _ => return Err("Unsupported database type for backup".to_string()),
    };

    let output = Command::new("docker")
        .args(["exec", &container_name, "sh", "-c", &cmd])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        std::fs::write(&output_path, &output.stdout).map_err(|e| e.to_string())?;
        Ok(format!("Backup saved to {}", output_path))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub async fn exec_in_container(container_name: String, command: String) -> Result<String, String> {
    let output = Command::new("docker")
        .args(["exec", &container_name, "sh", "-c", &command])
        .output()
        .map_err(|e| format!("Failed to exec: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok(stdout)
    } else if !stderr.is_empty() {
        Err(stderr)
    } else {
        Ok(stdout)
    }
}