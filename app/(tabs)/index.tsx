import { ScrollView, StatusBar } from "react-native"
import WebView from "react-native-webview"

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
      {/* #26a69a */}
      <StatusBar backgroundColor="black" />
      <WebView
        style={{ marginTop: "5%" }}
        source={{
          uri: `https://master.d27x1qtivql6on.amplifyapp.com/bible-page`,
        }}
        onMessage={(event) => handleWebViewMessage(event)}
      />
    </>
  )
}
