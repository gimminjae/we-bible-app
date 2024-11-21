import { SafeAreaView, ScrollView, StyleSheet } from "react-native"
import { StatusBar } from "expo-status-bar"
import WebView from "react-native-webview"
import * as Clipboard from "expo-clipboard"

export default function HomeScreen() {
  const handleWebViewMessage = (event: { nativeEvent: { data: string } }) => {
    const sendData: any = JSON.parse(event.nativeEvent.data)
    // 웹뷰에서 보내는 데이터
    const { type, data } = sendData
    if (type === "DB") {
      const { command, table, data: dbData } = data
      console.log(command, table, dbData)
    }
    if (type === "copy") {
      copyToClipboard(data)
    }
  }
  const copyToClipboard = async (content: string) => {
    await Clipboard.setStringAsync(content)
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        {/* #26a69a */}
        <StatusBar backgroundColor="black" hidden={false} />
        <WebView
          // style={{ marginTop: "5%" }}
          source={{
            uri: `https://app.we-bible.com/bible-page`,
            // uri: `http://localhost:3000/bible-page`,
          }}
          onMessage={(event) => handleWebViewMessage(event)}
        />
      </SafeAreaView>
    </>
  )
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  text: {
    fontSize: 25,
    fontWeight: "500",
  },
})
