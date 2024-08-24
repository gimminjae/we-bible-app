import React from 'react';
import {
  Icon,
  IconElement,
  Layout,
  MenuItem,
  OverflowMenu,
  TopNavigation,
  TopNavigationAction,
} from '@ui-kitten/components';
import {StyleSheet} from 'react-native';
import {TouchableWebElement} from '@ui-kitten/components/devsupport';

const BackIcon = (props: any): IconElement => (
  <Icon {...props} name="arrow-back" />
);

const EditIcon = (props: any): IconElement => <Icon {...props} name="edit" />;

const MenuIcon = (props: any): IconElement => (
  <Icon {...props} name="more-vertical" />
);

const InfoIcon = (props: any): IconElement => <Icon {...props} name="info" />;

const LogoutIcon = (props: any): IconElement => (
  <Icon {...props} name="log-out" />
);

export const TopNavbar = (): React.ReactElement => {
  const [menuVisible, setMenuVisible] = React.useState(false);

  const toggleMenu = (): void => {
    setMenuVisible(!menuVisible);
  };

  const renderMenuAction = (): React.ReactElement => (
    <TopNavigationAction icon={MenuIcon} onPress={toggleMenu} />
  );

  const renderRightActions = (): React.ReactElement => (
    <>
      <TopNavigationAction icon={EditIcon} />
      <OverflowMenu
        anchor={renderMenuAction}
        visible={menuVisible}
        onBackdropPress={toggleMenu}>
        <MenuItem accessoryLeft={InfoIcon} title="About" />
        <MenuItem accessoryLeft={LogoutIcon} title="Logout" />
      </OverflowMenu>
    </>
  );

  const renderBackAction = (): TouchableWebElement => (
    <TopNavigationAction icon={BackIcon} />
  );

  return (
    <Layout style={styles.container} level="1">
      <TopNavigation
        alignment="center"
        title="Eva Application"
        subtitle="Subtitle"
        accessoryLeft={renderBackAction}
        accessoryRight={renderRightActions}
      />
    </Layout>
  );
};

export default TopNavbar;

const styles = StyleSheet.create({
  container: {
    minHeight: 128,
  },
});
