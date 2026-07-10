import { AppTemplate } from "../types";

export const APP_TEMPLATES: AppTemplate[] = [
    {
        id: "wordpress",
        name: "WordPress",
        description: "Full WordPress stack with MySQL and phpMyAdmin",
        icon: "🌐",
        color: "#21759b",
        category: "cms",
        tags: ["PHP", "MySQL", "CMS"],
        ports: [8080, 8081, 3306],
        defaultEnv: {
            WORDPRESS_DB_PASSWORD: "wordpress_pass",
            MYSQL_ROOT_PASSWORD: "root_pass",
        },
        composeContent: `version: '3.8'
services:
  db:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: \${MYSQL_ROOT_PASSWORD:-root_pass}
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wordpress
      MYSQL_PASSWORD: \${WORDPRESS_DB_PASSWORD:-wordpress_pass}
    volumes:
      - db_data:/var/lib/mysql

  wordpress:
    image: wordpress:latest
    restart: unless-stopped
    ports:
      - "8080:80"
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_DB_USER: wordpress
      WORDPRESS_DB_PASSWORD: \${WORDPRESS_DB_PASSWORD:-wordpress_pass}
      WORDPRESS_DB_NAME: wordpress
    volumes:
      - wp_data:/var/www/html
    depends_on:
      - db

  phpmyadmin:
    image: phpmyadmin:latest
    restart: unless-stopped
    ports:
      - "8081:80"
    environment:
      PMA_HOST: db
      MYSQL_ROOT_PASSWORD: \${MYSQL_ROOT_PASSWORD:-root_pass}
    depends_on:
      - db

volumes:
  db_data:
  wp_data:`,
    },
    {
        id: "nextcloud",
        name: "Nextcloud",
        description: "Self-hosted cloud storage with PostgreSQL",
        icon: "☁️",
        color: "#0082c9",
        category: "storage",
        tags: ["Storage", "Files", "Collaboration"],
        ports: [8080, 5432],
        defaultEnv: {
            POSTGRES_PASSWORD: "nextcloud_pass",
            NEXTCLOUD_ADMIN_PASSWORD: "admin123",
        },
        composeContent: `version: '3.8'
services:
  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_DB: nextcloud
      POSTGRES_USER: nextcloud
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-nextcloud_pass}
    volumes:
      - db_data:/var/lib/postgresql/data

  nextcloud:
    image: nextcloud:latest
    restart: unless-stopped
    ports:
      - "8080:80"
    environment:
      POSTGRES_HOST: db
      POSTGRES_DB: nextcloud
      POSTGRES_USER: nextcloud
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-nextcloud_pass}
      NEXTCLOUD_ADMIN_USER: admin
      NEXTCLOUD_ADMIN_PASSWORD: \${NEXTCLOUD_ADMIN_PASSWORD:-admin123}
    volumes:
      - nextcloud_data:/var/www/html
    depends_on:
      - db

volumes:
  db_data:
  nextcloud_data:`,
    },
    {
        id: "grafana",
        name: "Grafana + Prometheus",
        description: "Full monitoring stack with dashboards and metrics",
        icon: "📊",
        color: "#f46800",
        category: "monitoring",
        tags: ["Monitoring", "Metrics", "Dashboards"],
        ports: [3000, 9090],
        defaultEnv: {
            GF_SECURITY_ADMIN_PASSWORD: "admin123",
        },
        composeContent: `version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  grafana:
    image: grafana/grafana:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: \${GF_SECURITY_ADMIN_PASSWORD:-admin123}
    volumes:
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus

volumes:
  prometheus_data:
  grafana_data:`,
    },
    {
        id: "gitea",
        name: "Gitea",
        description: "Lightweight self-hosted Git service",
        icon: "🦊",
        color: "#609926",
        category: "ci",
        tags: ["Git", "DevOps", "Repository"],
        ports: [3000, 222],
        defaultEnv: {
            GITEA_DB_PASSWD: "gitea_pass",
        },
        composeContent: `version: '3.8'
services:
  db:
    image: postgres:15
    restart: unless-stopped
    environment:
      POSTGRES_USER: gitea
      POSTGRES_PASSWORD: \${GITEA_DB_PASSWD:-gitea_pass}
      POSTGRES_DB: gitea
    volumes:
      - postgres_data:/var/lib/postgresql/data

  gitea:
    image: gitea/gitea:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
      - "222:22"
    environment:
      GITEA__database__DB_TYPE: postgres
      GITEA__database__HOST: db:5432
      GITEA__database__NAME: gitea
      GITEA__database__USER: gitea
      GITEA__database__PASSWD: \${GITEA_DB_PASSWD:-gitea_pass}
    volumes:
      - gitea_data:/data
    depends_on:
      - db

volumes:
  postgres_data:
  gitea_data:`,
    },
    {
        id: "minio",
        name: "MinIO",
        description: "S3-compatible object storage server",
        icon: "🪣",
        color: "#c72e40",
        category: "storage",
        tags: ["S3", "Object Storage", "Files"],
        ports: [9000, 9001],
        defaultEnv: {
            MINIO_ROOT_USER: "minioadmin",
            MINIO_ROOT_PASSWORD: "minioadmin123",
        },
        composeContent: `version: '3.8'
services:
  minio:
    image: minio/minio:latest
    restart: unless-stopped
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: \${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: \${MINIO_ROOT_PASSWORD:-minioadmin123}
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"

volumes:
  minio_data:`,
    },
    {
        id: "n8n",
        name: "n8n",
        description: "Workflow automation platform with PostgreSQL",
        icon: "🔄",
        color: "#ea4b71",
        category: "ci",
        tags: ["Automation", "Workflow", "Integration"],
        ports: [5678],
        defaultEnv: {
            N8N_BASIC_AUTH_PASSWORD: "n8n_pass",
            DB_POSTGRESDB_PASSWORD: "n8n_db_pass",
        },
        composeContent: `version: '3.8'
services:
  db:
    image: postgres:15
    restart: unless-stopped
    environment:
      POSTGRES_USER: n8n
      POSTGRES_PASSWORD: \${DB_POSTGRESDB_PASSWORD:-n8n_db_pass}
      POSTGRES_DB: n8n
    volumes:
      - db_data:/var/lib/postgresql/data

  n8n:
    image: n8nio/n8n:latest
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: db
      DB_POSTGRESDB_DATABASE: n8n
      DB_POSTGRESDB_USER: n8n
      DB_POSTGRESDB_PASSWORD: \${DB_POSTGRESDB_PASSWORD:-n8n_db_pass}
      N8N_BASIC_AUTH_ACTIVE: "true"
      N8N_BASIC_AUTH_USER: admin
      N8N_BASIC_AUTH_PASSWORD: \${N8N_BASIC_AUTH_PASSWORD:-n8n_pass}
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - db

volumes:
  db_data:
  n8n_data:`,
    },
    {
        id: "rabbitmq",
        name: "RabbitMQ",
        description: "Open-source message broker with management UI",
        icon: "🐰",
        color: "#ff6600",
        category: "messaging",
        tags: ["Message Queue", "AMQP", "Broker"],
        ports: [5672, 15672],
        defaultEnv: {
            RABBITMQ_DEFAULT_USER: "admin",
            RABBITMQ_DEFAULT_PASS: "rabbit_pass",
        },
        composeContent: `version: '3.8'
services:
  rabbitmq:
    image: rabbitmq:3-management
    restart: unless-stopped
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: \${RABBITMQ_DEFAULT_USER:-admin}
      RABBITMQ_DEFAULT_PASS: \${RABBITMQ_DEFAULT_PASS:-rabbit_pass}
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

volumes:
  rabbitmq_data:`,
    },
    {
        id: "keycloak",
        name: "Keycloak",
        description: "Identity and access management with PostgreSQL",
        icon: "🔐",
        color: "#4d9de0",
        category: "security",
        tags: ["Auth", "SSO", "Identity"],
        ports: [8080],
        defaultEnv: {
            KEYCLOAK_ADMIN_PASSWORD: "admin123",
            KC_DB_PASSWORD: "keycloak_pass",
        },
        composeContent: `version: '3.8'
services:
  db:
    image: postgres:15
    restart: unless-stopped
    environment:
      POSTGRES_DB: keycloak
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: \${KC_DB_PASSWORD:-keycloak_pass}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  keycloak:
    image: quay.io/keycloak/keycloak:latest
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://db/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: \${KC_DB_PASSWORD:-keycloak_pass}
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: \${KEYCLOAK_ADMIN_PASSWORD:-admin123}
      KC_HTTP_ENABLED: "true"
      KC_HOSTNAME_STRICT: "false"
    command: start-dev
    depends_on:
      - db

volumes:
  postgres_data:`,
    },
    {
        id: "ollama",
        name: "Ollama + Open WebUI",
        description: "Run LLMs locally with a ChatGPT-like interface",
        icon: "🤖",
        color: "#7c3aed",
        category: "ai",
        tags: ["AI", "LLM", "Local"],
        ports: [11434, 3000],
        defaultEnv: {},
        composeContent: `version: '3.8'
services:
  ollama:
    image: ollama/ollama:latest
    restart: unless-stopped
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    restart: unless-stopped
    ports:
      - "3000:8080"
    environment:
      OLLAMA_BASE_URL: http://ollama:11434
    volumes:
      - open_webui_data:/app/backend/data
    depends_on:
      - ollama

volumes:
  ollama_data:
  open_webui_data:`,
    },
    {
        id: "portainer",
        name: "Portainer",
        description: "Docker management UI — manage containers visually",
        icon: "🧭",
        color: "#13bef9",
        category: "monitoring",
        tags: ["Docker", "Management", "UI"],
        ports: [9000, 9443],
        defaultEnv: {},
        composeContent: `version: '3.8'
services:
  portainer:
    image: portainer/portainer-ce:latest
    restart: unless-stopped
    ports:
      - "9000:9000"
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  portainer_data:`,
    },
];

export const APP_CATEGORY_LABELS: Record<string, string> = {
    web: "Web Apps",
    cms: "CMS",
    monitoring: "Monitoring",
    ci: "DevOps / CI",
    storage: "Storage",
    messaging: "Messaging",
    security: "Security",
    ai: "AI / ML",
};
