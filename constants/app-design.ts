export const featureColors = {
  bible: {
    light: { ink: "#0F766E", soft: "#E6F5EF", border: "#B9DFD0" },
    dark: { ink: "#5EEAD4", soft: "#12352F", border: "#23554B" },
  },
  community: {
    light: { ink: "#315BB5", soft: "#EAF0FF", border: "#CAD8F5" },
    dark: { ink: "#A5C5FF", soft: "#1C2C4A", border: "#324B73" },
  },
  prayer: {
    light: { ink: "#7450B8", soft: "#F2ECFC", border: "#DFD1F2" },
    dark: { ink: "#D0B5FF", soft: "#302343", border: "#50366E" },
  },
  memo: {
    light: { ink: "#986313", soft: "#FFF4D9", border: "#EDD8A5" },
    dark: { ink: "#F6CD78", soft: "#382D1C", border: "#5E4928" },
  },
  favorite: {
    light: { ink: "#B24971", soft: "#FCEBF0", border: "#EFCBD7" },
    dark: { ink: "#F7ADC8", soft: "#3C2330", border: "#64384B" },
  },
  settings: {
    light: { ink: "#58677C", soft: "#EDF1F5", border: "#D6DFE8" },
    dark: { ink: "#BDD0E4", soft: "#243140", border: "#3C5065" },
  },
} as const;

export type FeatureTone = keyof typeof featureColors;

export const appColors = {
  light: {
    background: "#F7F9F6",
    surface: "#FFFFFF",
    text: "#1D302A",
    muted: "#66756F",
    border: "#E0E8E2",
  },
  dark: {
    background: "#101917",
    surface: "#192622",
    text: "#EFF7F1",
    muted: "#A7B8AF",
    border: "#2E4038",
  },
} as const;
