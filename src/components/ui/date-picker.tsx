"use client";

import * as React from 'react';
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
import 'dayjs/locale/ar';

interface DatePickerInputProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
}

export function DatePickerInput({ value, onChange }: DatePickerInputProps) {
  return (
    <LocalizationProvider 
      dateAdapter={AdapterDayjs}
      adapterLocale="ar"
    >
      <DatePicker
        value={value ? dayjs(value) : null}
        onChange={(newValue) => {
          onChange(newValue ? newValue.toDate() : null);
        }}
        format="D MMMM YYYY"
        views={['year', 'month', 'day']}
        openTo="day"
        slotProps={{
          textField: {
            size: "small",
            fullWidth: true,
            placeholder: "اختر التاريخ",
            sx: {
              '& .MuiInputBase-root': {
                color: 'inherit',
                backgroundColor: 'transparent',
                '& .MuiOutlinedInput-notchedOutline': {
                  border: 'none'
                },
                '& .MuiInputBase-input': {
                  color: 'inherit !important',
                  fontSize: 'inherit',
                  fontFamily: 'inherit',
                  padding: '0.5rem',
                  direction: 'rtl',
                  textAlign: 'right',
                  '&::placeholder': {
                    color: 'inherit',
                    opacity: 0.5
                  }
                },
                '& .MuiIconButton-root': {
                  color: 'inherit'
                }
              }
            }
          },
          layout: {
            sx: {
              direction: 'rtl',
              '.MuiPickersCalendarHeader-root': {
                direction: 'rtl',
              },
              '.MuiPickersCalendarHeader-labelContainer': {
                direction: 'rtl',
              },
              '.MuiPickersArrowSwitcher-root': {
                direction: 'ltr',
              },
              '.MuiDayCalendar-header, .MuiDayCalendar-weekContainer': {
                direction: 'rtl',
              }
            }
          },
          day: {
            sx: {
              '&.Mui-selected': {
                backgroundColor: '#4CAF50',
                color: '#fff',
              }
            }
          },
          popper: {
            sx: {
              '& .MuiPickersDay-root': {
                color: 'inherit',
                '&:hover': {
                  backgroundColor: 'rgba(76, 175, 80, 0.1)'
                },
                '&.Mui-selected': {
                  backgroundColor: '#4CAF50',
                  color: '#fff',
                  '&:hover': {
                    backgroundColor: '#45a049'
                  }
                }
              }
            }
          }
        }}
        disableFuture
        minDate={dayjs('1900-01-01')}
        className="w-full"
        sx={{
          '& .MuiInputBase-root': {
            color: 'inherit',
            backgroundColor: 'transparent',
            '& .MuiOutlinedInput-notchedOutline': {
              border: 'none'
            }
          },
          '& .MuiInputBase-input': {
            color: 'inherit',
            fontSize: 'inherit',
            fontFamily: 'inherit',
            padding: '0.5rem',
            direction: 'rtl',
            textAlign: 'right',
            '&::placeholder': {
              color: 'inherit',
              opacity: 0.5
            }
          },
          '& .MuiIconButton-root': {
            color: 'inherit'
          },
          '& .MuiPickersDay-root': {
            color: 'inherit',
            '&:hover': {
              backgroundColor: 'rgba(76, 175, 80, 0.1)'
            },
            '&.Mui-selected': {
              backgroundColor: '#4CAF50',
              color: '#fff',
              '&:hover': {
                backgroundColor: '#45a049'
              }
            }
          }
        }}
      />
    </LocalizationProvider>
  );
}
