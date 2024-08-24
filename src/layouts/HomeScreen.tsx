import React from 'react';
import {Layout, Text} from '@ui-kitten/components';
import {StyleSheet} from 'react-native';
import TopNavbar from '../components/TopNavbar';

export default function HomeScreen() {
  return (
    <Layout>
      <TopNavbar />
      <Text category="h1" style={styles.container}>
        HOME
      </Text>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    // justifyContent: 'center',
    // alignItems: 'center',
  },
});
