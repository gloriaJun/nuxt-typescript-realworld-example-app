import {join} from 'path'
import {esModule} from '../utils'
export default async function(options) {
  const webpack = esModule(await import('webpack'))
  const ForkTsCheckerWebpackPlugin = esModule(await import('fork-ts-checker-webpack-plugin'))
  const TsconfigPathsPlugin = esModule(await import('tsconfig-paths-webpack-plugin'))
  const {rootDir} = this.nuxt.options
  const {
    configFile = 'tsconfig.json',
    babel = {
      presets: ['@nuxt/babel-preset-app'],
      plugins: ['lodash'],
    },
  } = options

  // nuxt will not loader *.tsx? if the extensions has no ts, tsx
  this.nuxt.options.extensions.push('ts')
  this.nuxt.options.extensions.push('tsx')

  // Extend build
  this.extendBuild((config, {isDev}) => {
    const tsLoader = {
      // refer to https://github.com/nuxt/nuxt.js/issues/3164
      exclude: [/node_modules/, /vendor/, /dist/],
      use: [
        // go throw babel-loader after ts-loader
        {
          loader: 'babel-loader',
          options: babel,
        },
        {
          loader: 'ts-loader',
          options: {
            appendTsSuffixTo: [/\.vue$/],
            // refer to https://github.com/nuxt/nuxt.js/issues/3164
            configFile,
            transpileOnly: isDev,
            silent: true,
          },
        },
      ],
    }
    // Add TypeScript loader
    config.module.rules.push({
      // test: /((client|server)\.js)|(\.tsx?)$/,
      test: /\.tsx?$/,
      ...tsLoader,
    })

    // Add TypeScript loader for vue files
    for(let rule of config.module.rules){
      if(rule.loader === 'vue-loader'){
        if(!rule.options.loaders){
          rule.options.loaders = {}
        }
        rule.options.loaders.ts = tsLoader
      }
    }

    // Add .ts extension in webpack resolve
    if(config.resolve.extensions.indexOf('.ts') === -1){
      config.resolve.extensions.push('.ts')
    }

    // Add .tsx extension in webpack resolve
    if(config.resolve.extensions.indexOf('.tsx') === -1){
      config.resolve.extensions.push('.tsx')
    }

    // For Ts paths
    if(!config.resolve.plugins){
      config.resolve.plugins = []
    }

    // add alias for tsconfig.json> compilerOptions.paths
    config.resolve.plugins.push(
      new TsconfigPathsPlugin({
        configFile: join(rootDir, configFile),
        baseUrl: rootDir,
      }),
    )

    if(isDev){
      config.devtool = 'inline-source-map'

      // refer to https://www.npmjs.com/package/fork-ts-checker-webpack-plugin
      config.plugins.push(
        new ForkTsCheckerWebpackPlugin({
          checkSyntacticErrors: true,
          tslint: true,
          vue: true,
          watch: 'src',
          silent: true,
        }),
      )
      config.plugins.push(new webpack.WatchIgnorePlugin(['src/**/*.js', /\.d\.ts$/]))
    }
  })
}
