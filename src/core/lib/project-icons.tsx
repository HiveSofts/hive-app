import {
    DjangoIcon,
    DockerIcon,
    FastApiIcon,
    Html5Icon,
    LaravelIcon,
    NextjsIcon,
    NodejsIcon,
    NginxIcon,
    PhpIcon,
    ReactIcon,
    ViteIcon,
    VueIcon,
    WordpressIcon,
} from "@/components/icons";

export const getProjectIcon = (type: string) => {
    const icons: Record<string, any> = {
        laravel: LaravelIcon,
        react: ReactIcon,
        nextjs: NextjsIcon,
        vue: VueIcon,
        vite: ViteIcon,
        nodejs: NodejsIcon,
        php: PhpIcon,
        html5: Html5Icon,
        wordpress: WordpressIcon,
        docker: DockerIcon,
        django: DjangoIcon,
        fastapi: FastApiIcon,
        nginx: NginxIcon,
    };
    return icons[type] || null;
};
