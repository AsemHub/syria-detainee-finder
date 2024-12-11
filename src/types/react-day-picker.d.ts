import 'react-day-picker';

// Extend the CustomComponents type from react-day-picker

declare module 'react-day-picker' {
  interface CustomComponents {
    IconLeft?: React.ComponentType;
    IconRight?: React.ComponentType;
  }
}
