import { View } from "react-native";
import type { DadCategory } from "../utils/archetype";
import { DAD_CATEGORY_COLOR, DAD_CATEGORY_LABEL } from "../utils/archetype";
import { Feather, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";

type IconFn = (props: { size?: number; color?: string }) => JSX.Element;

const DAD_CATEGORY_ICON: Record<DadCategory, IconFn> = {
  coach_dad: (props) => <FontAwesome5 name="medal" {...props} />,
  calm_anchor_dad: (props) => <Feather name="anchor" {...props} />,
  fun_dad: (props) => (
    <MaterialCommunityIcons name="party-popper" {...props} />
  ),
  thoughtful_dad: (props) => <FontAwesome5 name="brain" {...props} />,
  builder_dad: (props) => <FontAwesome5 name="hammer" {...props} />,
  balanced_dad: (props) => (
    <FontAwesome5 name="balance-scale" {...props} />
  ),
};

type ArchetypeBadgeProps = {
  category: DadCategory;
  className?: string;
};

export default function ArchetypeBadge({
  category,
  className,
}: ArchetypeBadgeProps) {
  const label = DAD_CATEGORY_LABEL[category];
  const color = DAD_CATEGORY_COLOR[category];
  const Icon = DAD_CATEGORY_ICON[category];

  return (
    <View
      className={`h-12 w-12 items-center justify-center rounded-full border-2 border-white/20 ${className ?? ""}`}
      style={{
        backgroundColor: color,
        shadowColor: color,
        shadowOpacity: 0.28,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
      }}
      accessibilityRole="image"
      accessibilityLabel={`${label} dad archetype`}
    >
      <Icon size={20} color="#FFFFFF" />
    </View>
  );
}
