export default {
    root: 'src',
    build: {
        outDir: '../dist',
        lib: {
            entry: 'main.js',
            name: 'GaussianSplattingViewer',
            formats: ['iife'],
            fileName: () => 'bundle.gaussian-splatting.js'
        },
        rollupOptions: {
            output: {
                globals: {
                    three: 'THREE'
                }
            }
        },
        target: 'es2015'
    },
    server: {
        port: 8081,
        host: '0.0.0.0',
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp'
        }
    }
};