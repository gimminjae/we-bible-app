import { SafeAreaView, ScrollView, StyleSheet, StatusBar } from "react-native"
import WebView from "react-native-webview"
// import { SafeAreaView } from "react-native-safe-area-context"

export default function HomeScreen() {
  const handleWebViewMessage = (event: { nativeEvent: { data: string } }) => {
    const data: any = JSON.parse(event.nativeEvent.data)
    // 웹뷰에서 보내는 데이터
    if (data.type === "data" && data.data) {
      console.log(data)
    }
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        {/* #26a69a */}
        <StatusBar backgroundColor="black" />
        <WebView
          // style={{ marginTop: "5%" }}
          source={{
            uri: `https://app.we-bible.com/bible-page`,
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
