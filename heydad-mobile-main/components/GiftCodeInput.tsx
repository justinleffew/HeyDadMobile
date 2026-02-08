import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { Feather } from '@expo/vector-icons'

const GiftCodeInput = ({
  giftCode,
  isValidMessage,
  isDark,
  giftCodeStatus,
  showGiftCodeStatus,
  onGiftCodeChange
}) => {
  return <View className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-5 dark:border-gray-700 dark:bg-gray-800/60">
    <View className="w-full flex-row justify-between items-center">
      <Text className="text-slate-800 dark:text-slate-100 text-lg font-semibold mb-1">Do you have a gift code?</Text>
      <View className="absolute z-10 right-2 top-1/2 -translate-y-1/2 flex flex-row items-center">
        {showGiftCodeStatus &&
          giftCode.length &&
          giftCodeStatus === "checking" ? (
          <ActivityIndicator className="w-4 h-4 text-gray-500" />
        ) : null}

        {showGiftCodeStatus && giftCodeStatus === "valid" ? (
          <View className="text-green-500 font-semibold flex flex-row items-center">
            <View className="inline">
              <Feather color="green" name="check" size={16} className="inline" />
            </View>
            <Text className="inline text-xs ml-1 text-green-500 font-semibold">Valid</Text>
          </View>
        ) : null}

        {showGiftCodeStatus && giftCodeStatus === "invalid" ? (
          <View className="text-red-500 font-semibold flex flex-row items-center">
            <View className="inline">
              <Feather name="slash" color="red" size={16} className="inline" />
            </View>
            <Text className="inline text-xs ml-1 text-red-500 font-semibold">Invalid</Text>
          </View>
        ) : null}
      </View>
    </View>
    <Text className={`${giftCodeStatus === "valid" ? "text-green-500 font-medium" : "text-gray-500"} dark:text-gray-300 text-sm mb-4`}>
      {giftCodeStatus !== "valid" ? " Input the code someone special gave you here. " : isValidMessage || "Gift code is valid. Now sign up for an account and the code will be applied"}
    </Text>
    <View className='flex-row'>
      <TextInput
        value={giftCode}
        onChangeText={(text) => onGiftCodeChange(text)}
        placeholder="Enter the code here"
        placeholderTextColor={isDark ? '#94a3b8' : '#94a3b8'}
        autoCapitalize="characters"
        className="flex-1 mr-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-slate-800 dark:text-slate-100"
      />
    </View>
  </View>
}

export default GiftCodeInput
