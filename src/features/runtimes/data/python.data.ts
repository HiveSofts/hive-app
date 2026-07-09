import { Package } from "../types/runtime.types";

export const PYTHON_PACKAGES: Package[] = [
    { name: "pip", version: "23.3.1", global: true, description: "Package installer" },
    { name: "setuptools", version: "69.0.2", global: true, description: "Build tools" },
    { name: "wheel", version: "0.42.0", global: true, description: "Package format" },
    { name: "virtualenv", version: "20.25.0", global: true, description: "Virtual environments" },
    { name: "django", version: "4.2.9", global: false, description: "Web framework" },
    { name: "flask", version: "3.0.0", global: false, description: "Micro web framework" },
    { name: "fastapi", version: "0.109.0", global: false, description: "Modern web API framework" },
    { name: "requests", version: "2.31.0", global: true, description: "HTTP library" },
    { name: "numpy", version: "1.26.3", global: false, description: "Numerical computing" },
    { name: "pandas", version: "2.1.4", global: false, description: "Data analysis" },
    { name: "pytest", version: "7.4.4", global: true, description: "Testing framework" },
    { name: "black", version: "23.12.1", global: true, description: "Code formatter" },
];