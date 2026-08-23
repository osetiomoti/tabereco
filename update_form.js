const fs = require('fs');
const file = 'src/components/PostForm.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add showHotSpringDetails state
content = content.replace(
  'const [uploadTotal, setUploadTotal] = useState(0);',
  'const [uploadTotal, setUploadTotal] = useState(0);\n\n  const [showHotSpringDetails, setShowHotSpringDetails] = useState(true);'
);

// 2. Add Hot Spring Details Toggle
content = content.replace(
              <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">♨️</span>
              <span className="text-sm font-black text-orange-700 tracking-wider">温泉詳細情報</span>
            </div>,
              <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">♨️</span>
                <span className="text-sm font-black text-orange-700 tracking-wider">温泉詳細情報</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHotSpringDetails}
                  onChange={(e) => setShowHotSpringDetails(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-10 h-6 bg-orange-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500 shadow-inner"></div>
              </label>
            </div>
            {showHotSpringDetails && (
              <>
);

// 3. Close the Hot Spring Details block correctly
content = content.replace(
              {/* 浴槽ごとの温度設定 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-gray-500 tracking-widest">🌡️ 浴槽ごとの温度</label>
                <button
                  type="button"
                  onClick={() => {
                    const newBath: BathTemperatureInfo = { id: crypto.randomUUID(), name: '', min: 38, max: 38 };
                    set('bath_temperatures', [...values.bath_temperatures, newBath]);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-orange-100 text-orange-600 rounded-xl text-[11px] font-black hover:bg-orange-200 transition-all"
                >
                  <Plus size={12} strokeWidth={3} /> 浴槽を追加
                </button>
              </div>

              <div className="space-y-3">
                {values.bath_temperatures.map((bath, idx) => (
                  <BathTemperatureCard
                    key={bath.id}
                    bath={bath}
                    onUpdate={(updated) => {
                      const newArr = [...values.bath_temperatures];
                      newArr[idx] = updated;
                      set('bath_temperatures', newArr);
                    }}
                    onRemove={values.bath_temperatures.length > 1 ? () => {
                      set('bath_temperatures', values.bath_temperatures.filter((_, i) => i !== idx));
                    } : undefined}
                  />
                ))}
              </div>
            </div>
          </div>
        )},
              {/* 浴槽ごとの温度設定 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-gray-500 tracking-widest">🌡️ 浴槽ごとの温度 (任意)</label>
                <button
                  type="button"
                  onClick={() => {
                    const newBath: BathTemperatureInfo = { id: crypto.randomUUID(), name: '', min: 38, max: 38 };
                    set('bath_temperatures', [...values.bath_temperatures, newBath]);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-orange-100 text-orange-600 rounded-xl text-[11px] font-black hover:bg-orange-200 transition-all"
                >
                  <Plus size={12} strokeWidth={3} /> 浴槽を追加
                </button>
              </div>

              <div className="space-y-3">
                {values.bath_temperatures.map((bath, idx) => (
                  <BathTemperatureCard
                    key={bath.id}
                    bath={bath}
                    onUpdate={(updated) => {
                      const newArr = [...values.bath_temperatures];
                      newArr[idx] = updated;
                      set('bath_temperatures', newArr);
                    }}
                    onRemove={() => {
                      set('bath_temperatures', values.bath_temperatures.filter((_, i) => i !== idx));
                    }}
                  />
                ))}
              </div>
            </div>
              </>
            )}
          </div>
        )}
);

// 4. Update MultiSelect outside click
content = content.replace(
    const [customInput, setCustomInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);,
    const [customInput, setCustomInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);
);

content = content.replace(
  '    <div className="space-y-2">',
  '    <div className="space-y-2 relative" ref={dropdownRef}>'
);

content = content.replace(
  '      {showDropdown && (\\n        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">',
  '      {showDropdown && (\\n        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">'
);

// 5. Update Labels
const labels = [
  '🏠 施設タイプ', '💧 泉質', '🛁 浴槽情報', '🌊 源泉・管理方法', '🧴 シャンプー・石鹸', '🏨 利用タイプ', '🏔️ 秘湯感'
];
for (const label of labels) {
  content = content.replace(
    new RegExp(\label="\\$\{label\}"\, 'g'),
    \label="\\$\{label\} (任意)"\
  );
  content = content.replace(
    \\$\{label\}\n                {values.hidden_spring_rating != null\,
    \\$\{label\} (任意)\n                {values.hidden_spring_rating != null\
  );
}

fs.writeFileSync(file, content);
console.log('Update complete');
