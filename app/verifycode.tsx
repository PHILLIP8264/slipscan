import { useLocalSearchParams } from "expo-router";
import SignupVerifCode from "../assets/componets/ui/authui/SignupVerifCode";

export default function VerifyCodePage() {
  const { emailOrPhone } = useLocalSearchParams();
  return <SignupVerifCode email={emailOrPhone as string} />;
}
