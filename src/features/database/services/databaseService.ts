import { FaDatabase } from "@react-icons/all-files/fa/FaDatabase";
import { SiMongodb, SiMysql, SiPostgresql, SiRedis } from "react-icons/si";

import { Backup, Database, DatabaseService, QueryHistory } from "../types";

export const DATABASE_SERVICES: DatabaseService[] = [
    {
        id: "mysql",
        name: "MySQL",
        icon: SiMysql,
        version: "8.0.37",
        port: 3306,
        status: "running",
        memory: "124 MB",
        cpu: "2%",
        uptime: "14d 8h",
        dataSize: "2.3 GB",
        connections: 4,
    },
    {
        id: "postgresql",
        name: "PostgreSQL",
        icon: SiPostgresql,
        version: "16.3",
        port: 5432,
        status: "running",
        memory: "98 MB",
        cpu: "1%",
        uptime: "7d 12h",
        dataSize: "1.8 GB",
        connections: 3,
    },
    {
        id: "redis",
        name: "Redis",
        icon: SiRedis,
        version: "7.2.4",
        port: 6379,
        status: "running",
        memory: "12 MB",
        cpu: "0.5%",
        uptime: "21d 3h",
        dataSize: "156 MB",
        connections: 8,
    },
    {
        id: "mongodb",
        name: "MongoDB",
        icon: SiMongodb,
        version: "7.0.5",
        port: 27017,
        status: "stopped",
        memory: "0 MB",
        cpu: "0%",
        uptime: "-",
        dataSize: "-",
        connections: 0,
    },
    {
        id: "mariadb",
        name: "MariaDB",
        icon: FaDatabase,
        version: "11.2.2",
        port: 3307,
        status: "error",
        memory: "0 MB",
        cpu: "0%",
        uptime: "-",
        dataSize: "-",
        connections: 0,
    },
];

export const MOCK_DATABASES: Database[] = [
    { id: 1, name: "my_blog_db", service: "mysql", size: "128 MB", tables: 24, status: "active" },
    { id: 2, name: "api_db", service: "postgresql", size: "256 MB", tables: 42, status: "active" },
    { id: 3, name: "cache_store", service: "redis", size: "64 MB", tables: 0, status: "active" },
    {
        id: 4,
        name: "analytics_db",
        service: "mongodb",
        size: "512 MB",
        tables: 8,
        status: "inactive",
    },
    { id: 5, name: "wordpress_db", service: "mysql", size: "92 MB", tables: 12, status: "active" },
];

export const QUERY_HISTORY: QueryHistory[] = [
    {
        id: 1,
        db: "my_blog_db",
        query: "SELECT * FROM posts WHERE published = 1",
        duration: "12ms",
        time: "2 min ago",
    },
    {
        id: 2,
        db: "api_db",
        query: "UPDATE users SET last_login = NOW() WHERE id = 42",
        duration: "8ms",
        time: "5 min ago",
    },
    {
        id: 3,
        db: "cache_store",
        query: "GET user:session:abc123",
        duration: "1ms",
        time: "12 min ago",
    },
    {
        id: 4,
        db: "my_blog_db",
        query: "INSERT INTO comments (post_id, user_id, content) VALUES (15, 3, 'Great post!')",
        duration: "24ms",
        time: "1 hr ago",
    },
];

export const BACKUPS: Backup[] = [
    {
        id: 1,
        name: "my_blog_db_backup_2025-01-15",
        size: "128 MB",
        createdAt: "2025-01-15 02:00:00",
        status: "completed",
    },
    {
        id: 2,
        name: "api_db_backup_2025-01-15",
        size: "256 MB",
        createdAt: "2025-01-15 03:00:00",
        status: "completed",
    },
    {
        id: 3,
        name: "my_blog_db_backup_2025-01-14",
        size: "127 MB",
        createdAt: "2025-01-14 02:00:00",
        status: "completed",
    },
];

export const getDatabaseServices = () => DATABASE_SERVICES;
export const getDatabases = () => MOCK_DATABASES;
export const getQueryHistory = () => QUERY_HISTORY;
export const getBackups = () => BACKUPS;
