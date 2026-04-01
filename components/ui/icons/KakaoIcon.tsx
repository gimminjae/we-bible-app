import Ionicons from '@expo/vector-icons/Ionicons';

type KakaoIconProps = {
  color?: string;
  size?: number;
};

export function KakaoIcon({ color = 'black', size = 24 }: KakaoIconProps) {
  return <Ionicons name="chatbubble" size={size} color={color} />;
}
