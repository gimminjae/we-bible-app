import AntDesign from '@expo/vector-icons/AntDesign';

type AppleIconProps = {
  color?: string;
  size?: number;
};

export function AppleIcon({ color = 'black', size = 24 }: AppleIconProps) {
  return <AntDesign name="apple" size={size} color={color} />;
}
