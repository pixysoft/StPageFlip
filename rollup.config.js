import typescript from 'rollup-plugin-typescript2';
import postcss from 'rollup-plugin-postcss';
import { terser } from 'rollup-plugin-terser';

function tsPlugin() {
    return typescript({
        tsconfig: 'tsconfig.json',
        useTsconfigDeclarationDir: true,
        include: ['**/*.ts', '**/*.tsx'],
        tsconfigOverride: {
            compilerOptions: { declaration: false },
        },
    });
}

export default [
    {
        input: 'src/browser.ts',
        output: [{ file: 'dist/js/page-flip.browser.js', format: 'umd', name: 'St' }],
        plugins: [postcss(), tsPlugin(), terser()],
    },
    {
        input: 'src/browser.ts',
        output: [{ file: 'dist/js/page-flip.module.js', format: 'es' }],
        plugins: [postcss(), tsPlugin(), terser()],
    },
    {
        input: 'src/mini.ts',
        output: [{ file: 'dist/js/page-flip.mini.js', format: 'es' }],
        plugins: [tsPlugin()],
    },
];
