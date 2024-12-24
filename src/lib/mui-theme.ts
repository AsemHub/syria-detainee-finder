import { createTheme } from '@mui/material/styles';
import { arSD } from '@mui/material/locale';

export const theme = createTheme(
  {
    direction: 'rtl',
    typography: {
      fontFamily: 'var(--font-geist-sans)',
    },
    palette: {
      primary: {
        main: 'rgb(var(--primary))',
        contrastText: 'rgb(var(--primary-foreground))',
      },
    },
    components: {
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: 'rgb(var(--border))',
              },
              '&:hover fieldset': {
                borderColor: 'rgb(var(--border))',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'rgb(var(--ring))',
              },
            },
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          input: {
            height: '20px',
            padding: '8px 12px',
          },
        },
      },
    },
  },
  arSD,
);
