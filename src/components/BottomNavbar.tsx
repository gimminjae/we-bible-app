import React, {useState} from 'react';
import {BottomNavigation, BottomNavigationTab} from '@ui-kitten/components';
import {StyleSheet} from 'react-native';

export const BottomNavigationSimpleUsageShowcase = (): React.ReactElement => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  return (
    <BottomNavigation
      style={styles.fixBottom}
      selectedIndex={selectedIndex}
      onSelect={index => setSelectedIndex(index)}>
      <BottomNavigationTab title="Home" />
      <BottomNavigationTab title="Bible" />
      <BottomNavigationTab title="Setting" />
    </BottomNavigation>
  );
};
const styles = StyleSheet.create({
  container: {
    // flex: 1,
    // justifyContent: 'center',
    // alignItems: 'center',
  },
  fixBottom: {
    position: 'static',
    bottom: 0,
  },
});
