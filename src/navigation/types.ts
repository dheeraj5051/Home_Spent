import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp, RouteProp } from '@react-navigation/native';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  CreateGroup: undefined;
  GroupDetail: { groupId: string };
  AddExpense: { groupId: string };
  Settlements: { groupId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Groups: undefined;
  Analytics: undefined;
  Profile: undefined;
};

export type RootNavProp = NativeStackNavigationProp<RootStackParamList>;
export type HomeNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;
export type GroupDetailRouteProp = RouteProp<RootStackParamList, 'GroupDetail'>;
export type AddExpenseRouteProp = RouteProp<RootStackParamList, 'AddExpense'>;
export type SettlementsRouteProp = RouteProp<RootStackParamList, 'Settlements'>;
