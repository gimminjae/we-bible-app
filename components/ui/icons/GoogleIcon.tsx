import AntDesign from '@expo/vector-icons/AntDesign';

type GoogleIconProps = {
  color?: string;
  size?: number;
};

export function GoogleIcon({ color = 'black', size = 24 }: GoogleIconProps) {
  return <AntDesign name="google" size={size} color={color} />;
}
