const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// @tanstack/react-query ESM 빌드의 .js 서브패스 해석 이슈 회피: legacy CJS 사용
const reactQueryLegacy = path.resolve(
  __dirname,
  'node_modules/@tanstack/react-query/build/legacy/index.cjs'
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@tanstack/react-query') {
    return { filePath: reactQueryLegacy, type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
