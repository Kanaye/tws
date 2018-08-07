import typescript from "rollup-plugin-typescript2";
import babel from "rollup-plugin-babel";

import * as pkg from "./package.json";

export default [
    // browser esnext build
    {
        input: "./src/browser.ts",
        output: [{
            format: "es",
            file: "dist/browser.esnext.mjs",
            sourcemap: true 
        }],
        plugins: [
            typescript({
                tsconfig: "./config/tsconfig.browser.json",
                sourcemap: true
            })
        ]
    },
    // browser es5
    {
        input: "./src/browser.ts",
        output: [{
            format: "es",
            file: "dist/browser.mjs",
            sourcemap: true,
        },
        {
            format: "umd",
            file: "dist/browser.umd.js",
            sourcemap: true,
            name: pkg.build.umdName
        }],
        plugins: [
            typescript({
                tsconfig: "./config/tsconfig.browser.json",
                sourcemap: true
            }),
            babel({
                presets: [
                    ["@babel/preset-env", {
                        targets: {
                            browsers: [">0.25%", "not op_mini all"]
                        },
                        modules: false,
                        exclude: [
                            "transform-regenerator",
                            "transform-async-to-generator"
                        ]
                    }]
                ],
                plugins: [
                    "module:fast-async"
                ]
            })
        ]
    }
];