import typescript from "rollup-plugin-typescript2";
import * as pkg from "./package.json";

export default [
    // browser build
    {
        input: "./src/browser.ts", 
        output: [{
            format: "es",
            file: "dist/browser.esm.js",
            sourcemap: true
        },
        {
            format: "umd",
            file: "dist/browser.umd.js",
            name: pkg.build.umdName,
            sourcemap: true
        }],
        plugins: [
            typescript({
                tsconfig: "./config/tsconfig.browser.json"
            })
        ]
    }
];