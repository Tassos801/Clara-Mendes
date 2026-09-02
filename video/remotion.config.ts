import {Config} from '@remotion/cli/config';

// The film reads the storefront's own mockups and fonts; nothing is copied.
Config.setPublicDir('../public');
Config.setEntryPoint('./src/index.ts');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(90);
Config.setOverwriteOutput(true);
