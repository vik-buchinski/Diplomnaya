module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        develFolder: '.devel',
        publishFolder: '.publish',
        releaseFolder: '.release',
        stagingFolder: '<%= publishFolder %>/.staging',
        productionFolder: '<%= publishFolder %>/.production',
        stagingUrl: 'http://192.168.92.43:8888/',
        productionUrl: 'https://myrestaurantmobile.azati.com/',
        compressedJsName: "<%= pkg.name %>.min.js",

        jshint: {
            src: 'js/*.js'
        },
        jscs: {
            src: "js/*.js",
            options: {
                requireCurlyBraces: [ "if" ]
            }
        },
        csslint: {
            strict: {
                options: {
                    import: 2
                },
                src: ['css/**/*.css']
            },
            lax: {
                options: {
                    import: false
                },
                src: ['css/**/*.css']
            }
        },
        htmlhint: {
            build: {
                options: {
                    'tag-pair': true,
                    'tagname-lowercase': true,
                    'attr-lowercase': true,
                    'attr-value-double-quotes': true,
                    'doctype-first': true,
                    'spec-char-escape': true,
                    'id-unique': true,
                    'head-script-disabled': true,
                    'style-disabled': true
                },
                src: ['index.html', 'footer.html']
            }
        },
        uglify: {
            devel: {
                options: {
                    mangle: false,
                    beautify: true,
                    banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
                    compress: {
                        drop_debugger: false
                    }
                },
                files: {
                    '<%= develFolder %>/<%= compressedJsName %>': ['js/*.js']
                }
            },
            publish: {
                options: {
                    mangle: true,
                    // don't work: function name in index.html
                    // mangle: { toplevel: true },
                    compress: true,
                    banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
					preserveComments: 'some'
                },
                files: { '<%= stagingFolder %>/<%= compressedJsName %>': ['js/*.js'] }
            }      
        },
        cssmin: {
            devel: {
                files: { '<%= develFolder %>/css/styles.css': ['css/*.css'] }
            },
            publish: {
                files: { '<%= stagingFolder %>/css/styles.css': ['css/*.css'] }
            }
        },
        copy: {
            devel: {
                files: [
                    { src: 'res/**', dest: '<%= develFolder %>/' },
                    { src: 'img/**', dest: '<%= develFolder %>/' },
                    { src: 'libs/**', dest: '<%= develFolder %>/' },
                    { src: 'config.xml', dest: '<%= develFolder %>/' },
                    { src: 'index.html', dest: '<%= develFolder %>/' },
                    { src: 'footer.html', dest: '<%= develFolder %>/' },
                    { src: 'icon.png', dest: '<%= develFolder %>/' }
                ]
            },
            publish: {
                files: [
                    { src: 'res/**', dest: '<%= stagingFolder %>/' },
                    { src: 'img/**', dest: '<%= stagingFolder %>/' },
                    { src: 'libs/**', dest: '<%= stagingFolder %>/' },
                    { src: 'config.xml', dest: '<%= stagingFolder %>/' },
                    { src: 'index.html', dest: '<%= stagingFolder %>/' },
                    { src: 'footer.html', dest: '<%= stagingFolder %>/' },
                    { src: 'icon.png', dest: '<%= stagingFolder %>/' }
                ]
            },
            production: {
                files: [
                    { expand: true, cwd: '<%= stagingFolder %>/', src: ['**'], dest: '<%= productionFolder %>/' }
                ]
            }
        },
        clean: {
            devel: ["<%= develFolder %>/"],
            publish: ["<%= publishFolder %>/"]
        },
        compress: {
            staging: {
                options: {
                    archive: '<%= releaseFolder %>/staging.zip'
                },
				files : [
					{ expand: true, src: "**/*", cwd: "<%= stagingFolder %>/" }
				]
            },
            production: {
                options: {
                    archive: '<%= releaseFolder %>/production.zip'
                },
                files: [
				    { expand: true, src: "**/*", cwd: "<%= productionFolder %>/" }
                ]
            }
        },
        replace: {
            params: {
                src: ['<%= develFolder %>/index.html', '<%= develFolder %>/config.xml', '<%= develFolder %>/<%= compressedJsName %>'],
                overwrite: true,
                replacements: [
                    { from: "#app-token#", to: "712983c76424fa58fe436a91fd46762d" },
                    { from: "#restaurant-name#", to: "TemplateApp" },
                    { from: "#bundle-id#", to: "com.myrestaurantmobile.templateapp" },
                    { from: "#theme-section#", to: "chinese" },
                    { from: "#app-version#", to: "1.0.0" }
                ]
            },
            resources: {
                src: ['<%= develFolder %>/index.html'],
                overwrite: true,
                replacements: [
                    { 
                        from: /(\s)*<!-- Start #css-section# -->[\s\S]*(\s)*<!-- End #css-section# -->/g,
                        to: '<link rel="stylesheet" href="css/styles.css" />' 
                    },
                    {
                        from: /(\s)*<!-- Start #js-section# -->[\s\S]*(\s)*<!-- End #js-section# -->/g,
                        to: '<script type="text/javascript" src="<%= compressedJsName %>"></script>'
                    },
                ]
            },
            develBuild: {
                src: ['<%= develFolder %>/<%= compressedJsName %>'],
                overwrite: true,
                replacements: [
                    { from: "#services-address#", to: "<%= stagingUrl %>" }
                ]
            },
            publishBuild: {
                src: ['<%= stagingFolder %>/<%= compressedJsName %>'],
                overwrite: true,
                replacements: [
                    { from: "#services-address#", to: '<%= stagingUrl %>' }
                ]
            },
            urlProduction: {
                src: ['<%= productionFolder %>/<%= compressedJsName %>'],
                overwrite: true,
                replacements: [
                    { from: "<%= stagingUrl %>", to: '<%= productionUrl %>' }
                ]
            },
            resourcesPublish: {
                src: ['<%= stagingFolder %>/index.html'],
                overwrite: true,
                replacements: [
                    { 
                        from: /(\s)*<!-- Start #css-section# -->[\s\S]*(\s)*<!-- End #css-section# -->/g,
                        to: '<link rel="stylesheet" href="css/styles.css" />' 
                    },
                    {
                        from: /(\s)*<!-- Start #js-section# -->[\s\S]*(\s)*<!-- End #js-section# -->/g,
                        to: '<script type="text/javascript" src="<%= compressedJsName %>"></script>'
                    },
                ]
            }
        },
        watch: {
            files: ['**/*','!<%= develFolder %>/**/*', '!<%= publishFolder %>/**/*'],
            tasks: ['devel'],
        }
    });

    // Load the plugins
    grunt.loadNpmTasks('grunt-jscs-checker');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-csslint');
    grunt.loadNpmTasks('grunt-htmlhint');

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-compress');

    grunt.loadNpmTasks('grunt-text-replace');

    grunt.loadNpmTasks('grunt-contrib-watch');

    // Default task(s).
    grunt.registerTask('default', ['devel']);
    grunt.registerTask('devel', ['uglify:devel', 'cssmin:devel', 'copy:devel', 'replace:params', 'replace:resources', 'replace:develBuild']);
    grunt.registerTask('publish', ['clean:publish', 'uglify:publish', 'cssmin:publish', 'copy:publish', 'replace:resourcesPublish', 'replace:publishBuild', 'copy:production', 'replace:urlProduction']);
    grunt.registerTask('release', ['publish', 'compress:staging', 'compress:production']);

};