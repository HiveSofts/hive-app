// PHP Composer panel reuses the Laravel PackagesPanel directly.
// Both call the same backend commands (get_installed_packages, install_package,
// remove_package, search_packages) which work for any Composer-based project.
export { PackagesPanel as PhpComposerPanel } from "../laravel/PackagesPanel";
