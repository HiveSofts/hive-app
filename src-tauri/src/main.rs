#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod core;
mod modules;
mod types;

fn main() {
    hive_app_lib::run();
}
