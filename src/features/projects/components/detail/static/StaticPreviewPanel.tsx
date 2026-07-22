import { memo, useEffect, useRef, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { ExternalLink, FileText, Globe, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StaticPreviewPanelProps {
    projectPath: string;
    projectName?: string;
    host?: string;
    port?: number;
    description?: string;
    index_path?: string;
}

export const StaticPreviewPanel = memo(function StaticPreviewPanel({
    projectPath,
    host,
    port,
    description,
    index_path,
}: StaticPreviewPanelProps) {
    const [iframeSrc, setIframeSrc] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [customUrl, setCustomUrl] = useState("");
    const [availableFiles, setAvailableFiles] = useState<string[]>([]);
    const [selectedFile, setSelectedFile] = useState<string>(index_path || "index.html");
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);

    const serverUrl = host && port ? `http://${host}:${port}` : null;
    const fallbackServerUrl = serverUrl || `file://${projectPath}`;

    // Function to scan project directory for HTML files
    const scanProjectDirectory = async () => {
        setIsLoadingFiles(true);
        try {
            // Get all files in the project directory using the new Tauri command
            const files: string[] = await invoke("list_directory_contents", {
                path: projectPath,
            });

            // Filter for HTML files
            const htmlFiles = files.filter(
                (file) =>
                    file.toLowerCase().endsWith(".html") || file.toLowerCase().endsWith(".htm")
            );

            setAvailableFiles(htmlFiles);

            // If index.html exists, use it as default
            if (htmlFiles.includes("index.html")) {
                setSelectedFile("index.html");
            } else if (htmlFiles.length > 0) {
                setSelectedFile(htmlFiles[0]);
            } else {
                // If no HTML files found, still default to index.html
                setSelectedFile("index.html");
            }
        } catch (error) {
            console.error("Error scanning directory:", error);
            // Fallback to index.html if scanning fails
            setAvailableFiles(["index.html"]);
            setSelectedFile("index.html");
        } finally {
            setIsLoadingFiles(false);
        }
    };

    useEffect(() => {
        scanProjectDirectory();
    }, [projectPath]);

    useEffect(() => {
        if (serverUrl) {
            // Construct URL with the selected file
            const url =
                selectedFile && selectedFile !== "index.html"
                    ? `${serverUrl}/${selectedFile}`
                    : serverUrl;
            setIframeSrc(url);
        } else if (projectPath && selectedFile) {
            // For file:// protocol, construct the path to the specific file
            const filePath = `${projectPath}/${selectedFile}`;
            setIframeSrc(`file://${filePath}`);
        }
    }, [serverUrl, projectPath, selectedFile]);

    const handleRefresh = () => {
        setIsLoaded(false);
        if (iframeSrc) {
            setIframeSrc((prev) => `${prev}?t=${Date.now()}`);
        }
    };

    const handleCustomUrlSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (customUrl) {
            try {
                // Ensure URL has proper protocol
                const normalizedUrl = customUrl.startsWith("http")
                    ? customUrl
                    : `http://${customUrl}`;
                setIframeSrc(normalizedUrl);
                setIsLoaded(false);
            } catch (err) {
                console.error("Invalid URL:", err);
            }
        }
    };

    const openInBrowser = () => {
        if (iframeSrc) {
            window.open(iframeSrc, "_blank");
        }
    };

    const handleFileSelect = (fileName: string) => {
        setSelectedFile(fileName);
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Preview
                    </CardTitle>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={handleRefresh}>
                            <RefreshCw className={`w-4 h-4 ${!isLoaded ? "animate-spin" : ""}`} />
                            <span className="ml-2">Refresh</span>
                        </Button>
                        <Button size="sm" variant="outline" onClick={openInBrowser}>
                            <ExternalLink className="w-4 h-4" />
                            <span className="ml-2">Open in Browser</span>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCustomUrlSubmit} className="flex gap-2 mb-4">
                        <Input
                            value={customUrl}
                            onChange={(e) => setCustomUrl(e.target.value)}
                            placeholder="Enter custom URL to preview..."
                            className="font-mono"
                        />
                        <Button type="submit">Load</Button>
                    </form>

                    {serverUrl && (
                        <div className="mb-4 p-3 bg-muted rounded-md text-sm">
                            <p className="font-medium">Active Server:</p>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="font-mono">
                                    {serverUrl}
                                </Badge>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setCustomUrl(`${host}:${port}`)}
                                >
                                    Use this
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* File selector section */}
                    <div className="mb-4 border rounded-lg p-4 bg-muted/30">
                        <div className="flex items-center gap-2 mb-3">
                            <FileText className="w-4 h-4" />
                            <h3 className="font-medium">HTML Files in Project</h3>
                        </div>

                        {isLoadingFiles ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Scanning project directory...</span>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    Select an HTML file to preview:
                                </p>

                                <div className="flex flex-wrap gap-2">
                                    {availableFiles.length > 0 ? (
                                        availableFiles.map((file) => (
                                            <Button
                                                key={file}
                                                size="sm"
                                                variant={
                                                    selectedFile === file ? "default" : "outline"
                                                }
                                                onClick={() => handleFileSelect(file)}
                                                className="font-mono"
                                            >
                                                {file}
                                            </Button>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            No HTML files found in project directory
                                        </p>
                                    )}
                                </div>

                                <div className="mt-3 p-2 bg-background rounded border text-sm font-mono">
                                    Selected:{" "}
                                    <span className="text-primary font-medium">{selectedFile}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border rounded-lg overflow-hidden bg-white">
                        {iframeSrc ? (
                            <div className="relative w-full h-[600px]">
                                {!isLoaded && (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            <span>Loading preview...</span>
                                        </div>
                                    </div>
                                )}
                                <iframe
                                    src={iframeSrc}
                                    onLoad={() => setIsLoaded(true)}
                                    className="w-full h-full min-h-[600px]"
                                    title="Static Site Preview"
                                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
                                />
                            </div>
                        ) : (
                            <div className="h-[600px] flex items-center justify-center bg-muted">
                                <div className="text-center text-muted-foreground">
                                    <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No file selected for preview.</p>
                                    <p className="text-sm mt-2">
                                        {availableFiles.length > 0
                                            ? `Select a file from the list above.`
                                            : "Add some HTML files to your project directory."}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
});
