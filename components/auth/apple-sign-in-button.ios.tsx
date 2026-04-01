import * as AppleAuthentication from 'expo-apple-authentication';
import { View } from 'react-native';

type AppleSignInButtonProps = {
  disabled?: boolean;
  height: number;
  onPress: () => void;
  theme: 'light' | 'dark';
};

export function AppleSignInButton({
  disabled = false,
  height,
  onPress,
  theme,
}: AppleSignInButtonProps) {
  return (
    <View pointerEvents={disabled ? 'none' : 'auto'} style={{ opacity: disabled ? 0.6 : 1 }}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={
          theme === 'light'
            ? AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            : AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
        }
        cornerRadius={16}
        style={{ width: '100%', height }}
        onPress={onPress}
      />
    </View>
  );
}
