// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// The desktop binary is a thin wrapper around the shared `run()` entry point in
// lib.rs. Mobile targets do not use this file; they enter through the
// `mobile_entry_point` generated wrapper around `sitewise_lib::run()`.
fn main() {
    sitewise_lib::run()
}
