/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#00A884'; 
const tintColorDark = '#00E676';

export const Colors = {
  light: {
    text: '#111B21',
    secondaryText: '#667781',
    background: '#F0F2F5',
    tint: tintColorLight,
    icon: '#54656F',
    tabIconDefault: '#54656F',
    tabIconSelected: tintColorLight,
    headerBackground: '#FFFFFF',
    headerText: '#111B21',
    chatBackground: '#EFEAE2',
    myBubble: '#D9FDD3',
    theirBubble: '#FFFFFF',
    border: '#E9EDEF',
  },
  dark: {
    text: '#E9EDEF',
    secondaryText: '#8696A0',
    background: '#0B141A',
    tint: tintColorDark,
    icon: '#AEBAC1',
    tabIconDefault: '#AEBAC1',
    tabIconSelected: tintColorDark,
    headerBackground: '#111B21',
    headerText: '#E9EDEF',
    chatBackground: '#060C10',
    myBubble: '#005C4B',
    theirBubble: '#202C33',
    border: '#222D34',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
