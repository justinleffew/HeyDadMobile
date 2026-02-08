import { View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from "expo-clipboard";


type ChildrenGridProps = {
  children: any[];
  childImageUrls: Record<string, string>;
  calculateAge: (birthdate: string) => number;
  getAgeDescription: (age: number) => string;
  getNextUnlockDate: (birthdate: string) => Date;
  handleEdit: (child: any) => void;
  handleDelete: (id: string) => void;
  handleGenerateCode: (childId: string) => void;
  generatingCodes: Record<string, boolean>;
  isDark: boolean;
};

const ChildrenGrid = ({
  children,
  childImageUrls,
  calculateAge,
  getAgeDescription,
  getNextUnlockDate,
  handleEdit,
  handleDelete,
  handleGenerateCode,
  generatingCodes,
  isDark,
}: ChildrenGridProps) => {
  const cardSurfaceClass = isDark
    ? 'bg-[#1f2937] border border-gray-700 shadow-md'
    : 'bg-white shadow-md overflow-hidden border border-gray-200';
  const nameTextClass = isDark ? 'text-gray-100' : 'text-[#15202F]';
  const chipClass = isDark ? 'bg-gray-800' : 'bg-gray-100';
  const chipTextClass = isDark ? 'text-gray-200' : 'text-gray-800';
  const metadataTextClass = isDark ? 'text-gray-300' : 'text-[#15202F]';
  const metadataIconColor = isDark ? '#94A3B8' : 'gray';
  const editIconColor = isDark ? '#cbd5f5' : '#6B7280';
  const placeholderCircleClass = isDark ? 'bg-gray-700 border-gray-500' : 'bg-[#425563]/20 border-[#6B7F39]';
  const placeholderIconColor = isDark ? '#94A3B8' : '#425563';
  const viewButtonClass = isDark
    ? 'w-full flex-row items-center justify-center px-3 py-2 rounded-md bg-gray-700'
    : 'w-full flex-row items-center justify-center px-3 py-2 rounded-md bg-slate-800';
  const viewButtonTextClass = 'text-sm text-white font-semibold';
  const codeCardClass = isDark ? 'bg-gray-800 border border-gray-700' : 'bg-slate-100 border border-gray-200';
  const codeHeadingClass = isDark ? 'text-gray-300' : 'text-[#15202F]';
  const codeValueClass = isDark ? 'text-emerald-300' : 'text-slate-900';
  const codeButtonClass = isDark
    ? 'mt-3 flex-row items-center justify-center rounded-md bg-slate-700 px-3 py-2'
    : 'mt-3 flex-row items-center justify-center rounded-md bg-slate-800 px-3 py-2';
  const codeButtonDisabledClass = isDark
    ? 'mt-3 flex-row items-center justify-center rounded-md bg-gray-600 px-3 py-2 opacity-80'
    : 'mt-3 flex-row items-center justify-center rounded-md bg-gray-400 px-3 py-2 opacity-80';
  const router = useRouter()

  const handleCopy = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert("Copied", "The code was copied to the clipboard");
    } catch (e) {
      console.error("Failed to copy to clipboard", e);
      Alert.alert("Error", "Could not copy text");
    }
  };
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View className="px-4 flex-row flex-wrap">
        {children.map((child) => (
          <View className="w-full mb-6" key={child.id}>
            <View className="w-full">
              <View className={`rounded-lg p-6 ${cardSurfaceClass}`}>
                <View className="flex-row items-start justify-between mb-4">
                  <View className="flex-row items-center flex-1 mr-2">
                    {child.image_path && childImageUrls[child.id] ? (
                      <Image
                        source={{ uri: childImageUrls[child.id] }}
                        className={`w-16 h-16 rounded-full border ${isDark ? 'border-gray-600' : 'border-[#6B7F39]'}`}
                        resizeMode="cover"
                      />
                    ) : (
                      <View className={`w-16 h-16 rounded-full items-center justify-center border-2 ${placeholderCircleClass}`}>
                        <Ionicons name="person" size={32} color={placeholderIconColor} />
                      </View>
                    )}

                    <View className="ml-3 flex-1">
                      <Text className={`text-xl font-semibold ${nameTextClass}`}>
                        {child.name}
                      </Text>
                      <View className={`mt-2 self-start px-2.5 py-0.5 rounded-full ${chipClass}`}>
                        <Text className={`text-xs font-semibold ${chipTextClass}`}>
                          {getAgeDescription(calculateAge(child.birthdate))}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="flex-row items-center">
                    <TouchableOpacity
                      onPress={() => handleEdit(child)}
                      className="p-2"
                    >
                      <Ionicons name="create-outline" size={20} color={editIconColor} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(child.id)}
                      className="p-2"
                    >

                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="flex-row flex-wrap gap-4">
                  <View className="flex-row items-center">
                    <Ionicons name="calendar-outline" size={16} color={metadataIconColor} />
                    <Text className={`text-sm ml-2 font-semibold ${metadataTextClass}`}>
                      Born: {new Date(child.birthdate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="lock-closed-outline" size={16} color={metadataIconColor} />
                    <Text className={`text-sm ml-2 font-semibold ${metadataTextClass}`}>
                      Next Unlock: {getNextUnlockDate(child.birthdate).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                <View className={`mt-4 rounded-xl border px-4 py-3 ${codeCardClass}`}>
                  <Text className={`text-sm font-semibold uppercase tracking-wider ${codeHeadingClass}`}>
                    Access Code
                  </Text>
                  {child.access_code ? (
                    <Text
                      className={`mt-2 text-2xl font-bold ${codeValueClass}`}
                      style={{ letterSpacing: 6 }}
                    >
                      {child.access_code}
                    </Text>
                  ) : (
                    <Text className={`mt-2 text-sm ${metadataTextClass}`}>
                      No code generated yet. Tap below to create one for {child.name}.
                    </Text>
                  )}
                  <View className="flex-row flex-1">
                    <TouchableOpacity
                      style={{ flex: 1 }}
                      onPress={() => handleGenerateCode(child.id)}
                      disabled={!!generatingCodes[child.id]}
                      className={generatingCodes[child.id] ? codeButtonDisabledClass : codeButtonClass}
                      activeOpacity={0.7}
                    >
                      {generatingCodes[child.id] ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <View className="flex-row items-center">
                          <Ionicons name="key-outline" size={16} color="#FFFFFF" />
                          <Text className="ml-2 text-sm font-semibold text-white">
                            {child.access_code ? "Regenerate Code" : "Generate Code"}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    <View className='w-2 h-1'></View>
                    {child.access_code ?
                      <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => handleCopy(child.access_code)}
                        disabled={!!generatingCodes[child.id]}
                        className={generatingCodes[child.id] ? codeButtonDisabledClass : codeButtonClass}
                        activeOpacity={0.7}>
                        {generatingCodes[child.id] ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <View className="flex-row items-center">
                            <Ionicons name="copy-outline" size={16} color="#FFFFFF" />
                            <Text className="ml-2 text-sm font-semibold text-white">
                              Copy code
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>

                      : null}

                  </View>
                </View>

                <View className={`mt-4 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <TouchableOpacity
                    onPress={() => {
                      router.replace('(tabs)/memories')
                    }}
                    className={viewButtonClass}
                  >
                    <Text className={viewButtonTextClass}>View Stories</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default ChildrenGrid;
