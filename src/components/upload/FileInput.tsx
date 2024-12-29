"use client"

import { useRef } from "react"
import { Button } from "../ui/button"
import { InfoIcon, DocumentationIcon } from "../ui/icons"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip"
import classNames from 'classnames'

interface FileInputProps {
  selectedFile: File | null;
  isUploading: boolean;
  onFileSelect: (file: File | null) => void;
}

export function FileInput({ selectedFile, isUploading, onFileSelect }: FileInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    onFileSelect(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <Button
          type="button"
          variant={selectedFile ? "secondary" : "default"}
          onClick={handleClick}
          disabled={isUploading}
        >
          <DocumentationIcon className="mr-2 h-4 w-4" />
          {selectedFile ? "تغيير الملف" : "اختيار ملف"}
        </Button>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="h-4 w-4 mt-2 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent align="start" className="max-w-[300px]">
              <p>يجب أن يكون الملف بتنسيق CSV ويحتوي على الأعمدة التالية:</p>
              <ul className="list-disc list-inside mt-2 text-sm">
                <li>الاسم (مطلوب)</li>
                <li>تاريخ الاعتقال (مطلوب)</li>
                <li>مكان الاعتقال</li>
                <li>العمر</li>
                <li>الجنس</li>
                <li>الحالة</li>
                <li>ملاحظات</li>
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />

      {selectedFile && (
        <div
          className={classNames(
            "text-sm px-4 py-2 rounded-md",
            "bg-secondary text-secondary-foreground"
          )}
        >
          {selectedFile.name}
        </div>
      )}
    </div>
  )
}