import React from 'react';
import { Cloud, Download, Upload, X } from 'lucide-react';

interface CloudSyncModalProps {
  onClose: () => void;
  onUpload: () => void;
  onDownload: () => void;
}

const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ onClose, onUpload, onDownload }) => {

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-borderLight">

        {/* Header */}
        <div className="bg-[#FAFAFA] px-5 py-4 border-b border-borderLight flex justify-between items-center">
          <div className="flex items-center gap-2 text-textPrimary">
            <div className="bg-blue-100 p-2 rounded-full text-accentBlue">
              <Cloud size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm">Sincronización Local / Sheets</h3>
              <p className="text-[10px] text-textSecondary">Powered by Google Sheets</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          {/* Manual Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onUpload()}
              className="flex flex-col items-center justify-center p-4 border border-borderLight rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all group"
            >
              <div className="bg-blue-100 text-blue-600 p-3 rounded-full mb-2 group-hover:bg-blue-200 group-hover:scale-110 transition-transform">
                <Upload size={24} />
              </div>
              <span className="text-sm font-bold text-textPrimary">Subir a Sheets</span>
              <span className="text-[10px] text-textSecondary mt-1">Local -&gt; Sheets</span>
            </button>

            <button
              onClick={() => onDownload()}
              className="flex flex-col items-center justify-center p-4 border border-borderLight rounded-xl hover:bg-green-50 hover:border-green-200 transition-all group"
            >
              <div className="bg-green-100 text-green-600 p-3 rounded-full mb-2 group-hover:bg-green-200 group-hover:scale-110 transition-transform">
                <Download size={24} />
              </div>
              <span className="text-sm font-bold text-textPrimary">Bajar de Sheets</span>
              <span className="text-[10px] text-textSecondary mt-1">Sheets -&gt; Local</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloudSyncModal;