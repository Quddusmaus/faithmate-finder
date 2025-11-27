import { useTranslation } from 'react-i18next';
import { languages } from '@/i18n';
import { useLanguagePreference } from '@/hooks/useLanguagePreference';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const { saveLanguagePreference } = useLanguagePreference();

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <Select value={i18n.language} onValueChange={saveLanguagePreference}>
      <SelectTrigger className="w-[140px] gap-2">
        <Globe className="h-4 w-4" />
        <SelectValue>
          {currentLanguage.flag} {currentLanguage.nativeName}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <span className="flex items-center gap-2">
              <span>{lang.flag}</span>
              <span>{lang.nativeName}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default LanguageSwitcher;
