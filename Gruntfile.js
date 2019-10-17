const pkg = require('./package.json');

module.exports = function(grunt) {

    grunt.initConfig({
        pkg: pkg,

        browserify: {
            dist: {
                src: [],
                dest: 'www/bundle.js',
                options: {
                    require: Object.keys(pkg.dependencies)
                }
            }
        },

        concat: {
            css: {
                src: [
                    'node_modules/bootstrap/dist/css/bootstrap.css'
                ],
                dest: 'www/bundle.css'
            }
        },

        clean: {
            dist: [
                'node_modules/',
                'package-lock.json'
            ]
        }
    });

    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-clean');

    grunt.registerTask('default', ['browserify', 'concat']);
};