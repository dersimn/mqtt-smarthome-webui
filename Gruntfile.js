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

        gitinfo: {
            commands: {
                'local.branch.current.tag' : ['tag', '--points-at', 'HEAD']
            }
        },

        file_append: {
            something: {
                files: [
                    {
                        append: `
                            const pkgInfo = {
                                name: '<%= pkg.name %>',
                                version: '<%= pkg.version %>',
                                buildTime: <%= Date.now() %>,
                                git: {
                                    branch: '<%= gitinfo.local.branch.current.name %>',
                                    tag: '<%= gitinfo.local.branch.current.tag %>',
                                    hash: '<%= gitinfo.local.branch.current.SHA %>'
                                }
                            };
                        `,
                        input: 'www/bundle.js'
                    }
                ]
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
    grunt.loadNpmTasks('grunt-gitinfo');
    grunt.loadNpmTasks('grunt-file-append');

    grunt.registerTask('default', ['gitinfo', 'browserify', 'concat', 'file_append']);
};