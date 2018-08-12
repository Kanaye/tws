import typescript from "rollup-plugin-typescript2";
import babel from "rollup-plugin-babel";
import tsc from "typescript";
import * as pkg from "./package.json";
import dset from "dset";

const babelConfig = () => ({
    presets: [
        ["@babel/preset-env", {
            targets: {
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
});

const babelBrowser = () => {
    const conf = babelConfig();
    dset(conf, 'presets.0.1.targets.browsers', [">0.25%", "not op_mini all"]);
    return conf;
};

const babelNode = () => {
    const conf = babelConfig();
    dset(conf, 'presets.0.1.targets.node', "current");
    return conf;
};

export default [
    // browser esnext build
    {
        input: "./src/index.ts",
        output: [{
            format: "es",
            file: "dist/browser.esnext.mjs",
            sourcemap: true 
        }],
        plugins: [
            typescript()
        ]
    },
    // browser es5
    {
        input: "./src/index.ts",
        output: [{
            format: "es",
            file: "dist/index.mjs",
            sourcemap: true,
        },
        {
            format: "umd",
            file: "dist/index.umd.js",
            sourcemap: true,
            name: pkg.build.umdName
        }],
        plugins: [
            typescript({
                sourcemap: true,
                tsconfigOverride: {
                    compilerOptions: {
                        declaration: true
                    }
                },
                typescript: tsc
            }),
            babel(babelBrowser())
        ]
    },
    {
        input: "./src/node.ts",
        output: [{
            format: "es",
            file: "dist/node.mjs",
            sourcemap: true
        }, {
            format: "cjs",
            file: "dist/node.js",
            sourcemap: true
        }],
        plugins: [
            typescript({
                sourcemap: true,
                tsconfigOverride: {
                    compilerOptions: {
                        declaration: false
                    }
                },
                useTsconfigDeclarationDir: true,
                typescript: tsc
            }),
            babel(babelNode())
        ]
    }
];