import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  StatusBar,
  Dimensions,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router"
import {
  VIDEO_PROMPTS,
  getAllCategories,
  getPromptsByCategory,
} from "../../../constants/";
import { useAuth } from "hooks/useAuth";
import { useRouter } from "expo-router";
import { useTheme } from "../../../providers/ThemeProvider.tsx";

const { width: screenWidth } = Dimensions.get("window");

const TAGLINES = {
  "Family & Relationships": "Lessons from the family grill master.",
  "Life Lessons & Wisdom": "Dad hacks that actually work.",
  "Career & Work": "From toolbox to corner office tips.",
  "Education & Growth": "School of hard knocks edition.",
  "Personal Growth & Values": "Building character, one dad joke at a time.",
  "Childhood & Memories": "Stories from before you were cooler than me.",
};

const renderCategoryIcon = (name) => {
  const iconProps = { size: 24, color: "#E9E3D6" };
  const overlayIconProps = { size: 14, color: "#F2C26B" };

  switch (name) {
    case "Family & Relationships":
      return (
        <View className="w-12 h-12 rounded-2xl bg-[#233241] items-center justify-center relative">
          <Ionicons name="people" {...iconProps} />
          <View className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-[#3A4A3F] items-center justify-center">
            <Ionicons name="flame" {...overlayIconProps} />
          </View>
        </View>
      );
    case "Life Lessons & Wisdom":
      return (
        <View className="w-12 h-12 rounded-2xl bg-[#233241] items-center justify-center relative">
          <Ionicons name="bulb" {...iconProps} />
          <View className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-[#3A4A3F] items-center justify-center">
            <Ionicons name="construct" size={14} color="#D2B48C" />
          </View>
        </View>
      );
    case "Career & Work":
      return (
        <View className="w-12 h-12 rounded-2xl bg-[#233241] items-center justify-center relative">
          <Ionicons name="briefcase" {...iconProps} />
          <View className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-[#3A4A3F] items-center justify-center">
            <Ionicons name="construct" size={14} color="#D2B48C" />
          </View>
        </View>
      );
    case "Education & Growth":
      return (
        <View className="w-12 h-12 rounded-2xl bg-[#233241] items-center justify-center relative">
          <Ionicons name="school" {...iconProps} />
          <View className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-[#3A4A3F] items-center justify-center">
            <Ionicons name="cube" size={14} color="#A0B5A8" />
          </View>
        </View>
      );
    case "Personal Growth & Values":
      return (
        <View className="w-12 h-12 rounded-2xl bg-[#233241] items-center justify-center">
          <Ionicons name="american-football-outline" {...iconProps} />
        </View>
      );
    case "Childhood & Memories":
      return (
        <View className="w-12 h-12 rounded-2xl bg-[#233241] items-center justify-center">
          <Ionicons name="sparkles" {...iconProps} />
        </View>
      );
    case "Entertainment & Culture":
      return (
        <View className="w-12 h-12 rounded-2xl bg-[#233241] items-center justify-center">
          <Ionicons name="american-football-outline" {...iconProps} />
        </View>
      );
    case "Legacy & Future":
      return (
        <View className="w-12 h-12 rounded-2xl bg-[#233241] items-center justify-center">
          <Ionicons name="accessibility-outline" {...iconProps} />
        </View>
      );
    case "Philosophy & Beliefs":
      return (
        <View className="w-12 h-12 rounded-2xl bg-[#233241] items-center justify-center">
          <Ionicons name="color-filter-outline" {...iconProps} />
        </View>
      );
    default:
      return (
        <View className="w-12 h-12 rounded-2xl bg-[#233241] items-center justify-center">
          <Ionicons name="people" {...iconProps} />
        </View>
      );
  }
};

const Ideas = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [displayedPrompts, setDisplayedPrompts] = useState([]);
  const [categories, setCategories] = useState([]);
  const router = useRouter()
  const params = useLocalSearchParams()
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const scrollViewRef = useRef(null);

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };


  useEffect(() => {
    const all = getAllCategories();
    setCategories(all);
    setDisplayedPrompts([]);
  }, []);

  const handleSearch = (term) => {
    setSearchTerm(term);
    if (term.trim() === "") {
      if (!selectedCategory) return setDisplayedPrompts([]);
      return setDisplayedPrompts(getPromptsByCategory(selectedCategory.id));
    }
    const base = selectedCategory
      ? getPromptsByCategory(selectedCategory.id)
      : VIDEO_PROMPTS;
    setDisplayedPrompts(
      base.filter((p) => p.toLowerCase().includes(term.toLowerCase())),
    );
  };

  const selectCategory = (cat) => {
    setSelectedCategory(cat);
    setSearchTerm("");
    setDisplayedPrompts(getPromptsByCategory(cat.id));
    setTimeout(scrollToTop, 500)
  };

  const clearCategory = () => {
    setSelectedCategory(null);
    setDisplayedPrompts([]);
    setSearchTerm("");
  };

  const handleRecordWithPrompt = (prompt) => {
    router.replace({
      pathname: "(tabs)/memories/capture",
      params: {
        defaultTab: params?.tab || 'audio',
        selectedPrompt: prompt
      }
    })
  };

  const quickStarters = displayedPrompts.slice(0, 3);

  const categoryCardClass = isDark
    ? "rounded-xl border border-gray-700 bg-[#1f2937]"
    : "rounded-xl border border-gray-300 bg-white";

  const categoryTitleClass = isDark ? "text-gray-100" : "text-[#15202F]";
  const categoryBodyClass = isDark ? "text-gray-400" : "text-gray-400";

  const renderCategoryItem = ({ item, index }) => (
    <TouchableOpacity
      onPress={() => selectCategory(item)}
      className="flex-1 m-1"
      style={{ minWidth: (screenWidth - 48) / 2 - 8 }}>
      <View
        className={`${categoryCardClass} p-6 items-center justify-center`}>
        <View className="mb-4">{renderCategoryIcon(item.name)}</View>
        <Text className={`text-base font-bold text-center mb-1 ${categoryTitleClass}`}>
          {item.name}
        </Text>
        <Text className={`text-sm text-center ${categoryBodyClass}`}>
          {TAGLINES[item.name] || "Moments worth saving forever."}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const quickStarterCardClass = isDark
    ? "bg-[#1f2937] border border-gray-700"
    : "bg-white border border-gray-300";
  const quickStarterTitleClass = isDark ? "text-gray-100" : "text-[#15202F]";
  const quickStarterMetaClass = isDark ? "bg-gray-800" : "bg-gray-100";
  const quickStarterMetaTextClass = isDark ? "text-gray-300" : "text-gray-600";

  const renderQuickStarter = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleRecordWithPrompt(item)}
      className={`rounded-xl p-4 mr-3 ${quickStarterCardClass}`}
      style={{ width: screenWidth * 0.8 }}
    >
      <View className="flex-row items-start justify-between">
        <Text className={`flex-1 font-medium mr-2 ${quickStarterTitleClass}`}>
          {item}
        </Text>
        <View className={`${quickStarterMetaClass} rounded-full px-2 py-1 flex-row items-center`}>
          <Ionicons name="videocam" size={14} color={isDark ? "#cbd5f5" : "#6B7280"} />
          <Text className={`text-xs ml-1 font-semibold ${quickStarterMetaTextClass}`}>60s</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const promptCardClass = isDark
    ? "bg-[#1f2937] border border-gray-700"
    : "bg-white border border-gray-400";
  const promptTitleClass = isDark ? "text-gray-100" : "text-[#15202F]";

  const renderPromptItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleRecordWithPrompt(item)}
      className={`rounded-2xl mb-3 overflow-hidden ${promptCardClass}`}
    >
      <View className="absolute left-0 top-0 bottom-0 w-1 bg-[#c4a471]" />
      <View className="p-5 pl-6">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-4">
            <Text className={`text-lg font-medium mb-2 ${promptTitleClass}`}>
              {item}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const screenBackground = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const headerBackgroundColor = isDark ? '#1f2937' : '#1e293b';
  const sectionBackgroundClass = isDark ? 'bg-[#1f2937]' : 'bg-gray-50';
  const headingTextClass = isDark ? 'text-gray-100' : 'text-[#15202F]';
  const bodyTextClass = isDark ? 'text-gray-400' : 'text-gray-400';
  const searchInputClass = isDark
    ? 'w-full pl-10 pr-4 py-3 border border-gray-600 rounded-lg bg-gray-800 text-gray-100'
    : 'w-full pl-10 pr-4 py-3 border border-gray-400 rounded-lg bg-white text-[#15202F]';
  const searchIconColor = isDark ? '#94A3B8' : '#6B7280';
  const backButtonClass = isDark ? 'bg-gray-700' : 'bg-slate-800';
  const backButtonTextClass = 'text-white font-medium ml-2';
  const quickStarterLabelClass = isDark ? 'text-gray-300' : 'text-gray-600';
  const emptyStateTextClass = isDark ? 'text-gray-300' : 'text-gray-600';
  const ctaGradientColors = isDark ? ['#1E293B', '#475569', '#1E293B'] : ['#1E293B', '#475569', '#1E293B'];
  const heroGradientColors = isDark ? ['#1E293B', '#475569', '#1E293B'] : ['#F8F5EF', '#FFFFFF'];
  const heroBorderClass = isDark ? 'border border-gray-700' : 'border border-gray-300';

  return (
    <SafeAreaView className={`flex-1 ${screenBackground}`}>
      <StatusBar barStyle={isDark ? 'light' : 'dark'} backgroundColor={headerBackgroundColor} />
      {/* Header */}
      <View className={`px-4 py-8 ${sectionBackgroundClass}`}>
        <Text className={`text-center font-merriweather text-2xl mb-2 ${headingTextClass}`}>
          Hey Dad, Ready to Drop Some Wisdom?
        </Text>
        <Text className={`${bodyTextClass} mt-2 text-center mx-auto w-10/12`}>
          Pick an idea, record a story. Your kids will thank you one day.
        </Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ paddingBottom: 80 }}
        className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View className="mb-6 mt-6">
          <View className="relative">
            <Ionicons
              name="search"
              size={20}
              color={searchIconColor}
              style={{ position: 'absolute', left: 12, top: 10, zIndex: 1 }}
            />
            <TextInput
              placeholder="Search ideas..."
              value={searchTerm}
              onChangeText={handleSearch}
              className={searchInputClass}
              placeholderTextColor={searchIconColor}
            />
          </View>
        </View>

        {/* Prompts List */}
        {displayedPrompts.length === 0 ? (
          <View style={{ marginTop: 8, marginBottom: 16 }} className="items-center">
            {selectedCategory ? (
              <>
                <Ionicons name="bulb-outline" size={64} color={isDark ? '#64748b' : '#9CA3AF'} style={{ opacity: 0.5 }} />
                <Text className={`${emptyStateTextClass} text-lg mt-4`}>No ideas found in this category.</Text>
              </>
            ) : searchTerm ? (
              <>
                <Ionicons name="bulb-outline" size={64} color={isDark ? '#64748b' : '#9CA3AF'} style={{ opacity: 0.5 }} />
                <Text className={`${emptyStateTextClass} text-lg mt-4`}>No ideas matched your search.</Text>
                <TouchableOpacity
                  onPress={() => {
                    setSearchTerm("");
                    handleSearch("");
                  }}
                  className={`border mt-3 rounded-md p-3 items-center justify-center ${isDark ? "border-slate-400" : "border-slate-700"}`}
                >
                  <Text className={`${isDark ? 'text-gray-200' : 'text-[#15202F]'} font-medium`}>Clear search</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        ) : (
          <FlatList
            data={displayedPrompts}
            renderItem={renderPromptItem}
            scrollEnabled={false}
            className="mb-6"
          />
        )}

        <View>
          <LinearGradient
            colors={ctaGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ marginBottom: 16, padding: 32, borderRadius: 16 }}
            className="rounded-2xl p-8 items-center relative overflow-hidden">
            <View className="absolute top-0 right-0 w-32 h-32 bg-blue-400/20 rounded-full -translate-y-8 translate-x-8" />
            <View className="absolute bottom-0 left-0 w-24 h-24 bg-orange-400/20 rounded-full translate-y-8 -translate-x-8" />

            <Text className="text-center text-xl font-bold text-white mb-2">Ready to Start Recording?</Text>
            <Text className="text-gray-300 text-center mb-4">
              Choose a prompt above or start with a blank recording
            </Text>
            <TouchableOpacity
              onPress={() => router.replace("(tabs)/memories/capture")}
              style={{ alignItems: "center", justifyContent: "center" }}
              className="bg-white rounded-lg px-6 py-3 flex-row items-center"
            >
              <Ionicons name="videocam" size={20} color="#15202F" />
              <Text className="text-center text-[#15202F] font-medium ml-2">Start Recording</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>



        {selectedCategory ? (
          <TouchableOpacity
            onPress={clearCategory}
            className={`w-full flex-row items-center justify-center px-4 py-3 rounded-lg mb-4 ${backButtonClass}`}
          >
            <Ionicons name="arrow-back" size={16} color="white" />
            <Text className={backButtonTextClass}>Back to Categories</Text>
          </TouchableOpacity>
        ) : (
          <FlatList
            contentContainerStyle={{
              gap: 8
            }}
            data={categories}
            renderItem={renderCategoryItem}
            scrollEnabled={false}
            className="mb-4"
          />
        )}

        {selectedCategory && (
          <LinearGradient
            colors={heroGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ borderRadius: 16, marginBottom: 16, padding: 20, overflow: "hidden" }}
            className={`rounded-2xl p-5 mb-4 ${heroBorderClass}`}
          >
            <View className="flex-row items-center">
              <View className="mr-4">{renderCategoryIcon(selectedCategory.name)}</View>
              <View className="flex-1">
                <Text className={`text-xl font-bold mb-1 ${headingTextClass}`}>
                  {selectedCategory.name}
                </Text>
                <Text className={`text-sm ${bodyTextClass}`}>
                  {TAGLINES[selectedCategory.name] || "Pick one and start recording."}
                </Text>
              </View>
              <Text className={`text-sm ${bodyTextClass}`}>
                {displayedPrompts.length} ideas
              </Text>
            </View>
          </LinearGradient>
        )}

        {selectedCategory && quickStarters.length > 0 && (
          <View className="mb-4">
            <View className="flex-row items-center mb-2">
              <Ionicons name="sparkles" size={16} color={isDark ? '#cbd5f5' : '#6B7280'} />
              <Text className={`text-sm font-semibold uppercase tracking-wide ml-2 ${quickStarterLabelClass}`}>Story Ideas</Text>
            </View>
            <FlatList
              data={quickStarters}
              renderItem={renderQuickStarter}
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
            />
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

export default Ideas;
