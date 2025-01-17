/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable global-require */
import { InputOptions, OutputOptions } from 'rollup';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';
import sourceMaps from 'rollup-plugin-sourcemaps';
import { terser } from 'rollup-plugin-terser';
import babel from 'rollup-plugin-babel';
import svgr from '@svgr/rollup';
import image from '@rollup/plugin-image';
import postcss from 'rollup-plugin-postcss';
import { external, getOutputFilePath } from '../utils';
import { createBabelConfig } from './create-babel-config';
import {
  MAIN_FIELDS_FOR_WEB,
  MAIN_FIELDS_FOR_NODE,
  moduleFileExtensions,
} from './constants';
import { globals, getAppPackageInfo } from './paths';

/**
 * 判断是否是React组件库
 */
function isReactLib() {
  const pkgInfo = getAppPackageInfo();

  return (
    (pkgInfo.dependencies && pkgInfo.dependencies.react) ||
    (pkgInfo.peerDependencies && pkgInfo.peerDependencies.react)
  );
}

/**
 * 创建rollup输入配置选项
 *
 * @export
 * @param {('es' | 'cjs' | 'umd')} format 打包后js文件的格式
 * @param {('development' | 'production')} env 打包后js文件的运行环境
 * @param {BuildOptions} input 打包配置项
 * @returns
 */
export function createRollupInputOptions(
  format: 'es' | 'cjs' | 'umd',
  env: 'development' | 'production',
  input: BuildOptions,
) {
  const inputOptions: InputOptions = {
    external,
    input: input.entry,
    treeshake: {
      propertyReadSideEffects: false,
    },
    // 忽略此 rollup 警告：The 'this' keyword is equivalent to 'undefined' at the top level of an ES module, and has been rewritten
    onwarn(warning, warn) {
      if (warning.code === 'CIRCULAR_DEPENDENCY') return;
      warn(warning);
    },
    plugins: [
      postcss(),
      nodeResolve({
        mainFields:
          input.target === 'web' ? MAIN_FIELDS_FOR_WEB : MAIN_FIELDS_FOR_NODE,
        extensions: moduleFileExtensions,
      }),
      format === 'umd' &&
        commonjs({
          include: /\/node_modules\//,
        }),
      json(),
      isReactLib() &&
        svgr({
          prettier: true,
          svgo: true,
        }),
      image(),
      babel({
        babelrc: false,
        runtimeHelpers: format !== 'umd',
        exclude: ['**/node_modules/**'],
        extensions: moduleFileExtensions,
        ...createBabelConfig(format, format === 'es' ? 'production' : env),
      }),
      replace({
        'process.env.NODE_ENV': JSON.stringify(
          format === 'es' ? 'produciton' : env,
        ),
      }),
      sourceMaps(),
      env === 'production' &&
        terser({
          sourcemap: true,
          output: { comments: false },
          compress: {
            keep_infinity: true,
            pure_getters: true,
            collapse_vars: false,
          },
          ecma: 5,
          toplevel: true,
          warnings: true,
        }),
    ].filter(Boolean) as Plugin[],
  };

  return inputOptions;
}

/**
 * 创建rollup输出配置选项
 *
 * @export
 * @param {('es' | 'cjs' | 'umd')} format 打包后js文件的格式
 * @param {('development' | 'production')} env 打包后js文件的运行环境
 *
 * @returns
 */
export function createRollupOutputOptions(
  format: 'es' | 'cjs' | 'umd',
  env: 'development' | 'production',
  input: BuildOptions,
) {
  const outputOptions: OutputOptions = {
    file: getOutputFilePath(input.outDir, format, env),
    name: input.name,
    sourcemap: true,
    globals,
    format,
    freeze: false,
    esModule: format === 'cjs',
    exports: 'named',
  };

  return outputOptions;
}

/**
 * 创建rollup配置项
 *
 * @export
 * @param {('es' | 'cjs' | 'umd')} format 格式化
 * @param {('development' | 'production')} env 运行环境
 * @param {BuildOptions} input 打包配置项
 * @returns {[InputOptions, OutputOptions]} 返回rollup输入和输出配置项数组，第一项为输入配置，第二项为输出配置。
 */
export function createRollupOptions(
  format: 'es' | 'cjs' | 'umd',
  env: 'development' | 'production',
  input: BuildOptions,
): [InputOptions, OutputOptions] {
  return [
    createRollupInputOptions(format, env, input),
    createRollupOutputOptions(format, env, input),
  ];
}
