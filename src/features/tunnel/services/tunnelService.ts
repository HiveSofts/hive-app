import { Project, RequestLog } from "../types";

export const MOCK_PROJECTS: Project[] = [
    { id: 1, name: "my-blog", url: "my-blog.test", port: 8000, status: "running" },
    { id: 2, name: "dashboard-app", url: "dashboard-app.test", port: 3000, status: "running" },
    { id: 3, name: "api-gateway", url: "api-gateway.test", port: 3001, status: "stopped" },
];

export const MOCK_REQUESTS: RequestLog[] = [
    {
        id: "1",
        method: "GET",
        path: "/api/posts",
        statusCode: 200,
        ip: "185.123.45.67",
        timestamp: "2 min ago",
        duration: "12ms",
    },
    {
        id: "2",
        method: "POST",
        path: "/webhook/github",
        statusCode: 201,
        ip: "140.82.112.3",
        timestamp: "5 min ago",
        duration: "45ms",
        body: '{"ref":"refs/heads/main","commits":[{"id":"abc123","message":"Update"}]}',
    },
    {
        id: "3",
        method: "GET",
        path: "/api/users/42",
        statusCode: 404,
        ip: "192.168.1.1",
        timestamp: "12 min ago",
        duration: "8ms",
    },
    {
        id: "4",
        method: "POST",
        path: "/webhook/stripe",
        statusCode: 200,
        ip: "54.187.25.1",
        timestamp: "18 min ago",
        duration: "234ms",
        body: '{"id":"evt_123","type":"payment_intent.succeeded"}',
    },
    {
        id: "5",
        method: "PUT",
        path: "/api/posts/15",
        statusCode: 200,
        ip: "185.123.45.67",
        timestamp: "25 min ago",
        duration: "23ms",
    },
];

export const generateSessionUrl = (projectName: string): string => {
    const random = Math.random().toString(36).substring(2, 8);
    return `https://${projectName}-${random}.expose.dev`;
};

export const getStatusColor = (statusCode: number): string => {
    if (statusCode >= 200 && statusCode < 300) return "text-emerald-500";
    if (statusCode >= 400 && statusCode < 500) return "text-yellow-500";
    if (statusCode >= 500) return "text-red-500";
    return "text-muted-foreground";
};

export const getProjects = () => MOCK_PROJECTS;
export const getRequests = () => MOCK_REQUESTS;
