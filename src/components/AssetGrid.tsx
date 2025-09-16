import React from 'react';
import { Clock, Download } from 'lucide-react';

interface AssetImage {
  id: string;
  url: string;
  type: 'uploaded' | 'generated';
  projectName?: string;
  projectId?: string;
  nodeId?: string;
  createdAt: string;
}

interface AssetGridProps {
  images: AssetImage[];
  title: string;
  loading?: boolean;
  onImageClick?: (image: AssetImage) => void;
  showProjectInfo?: boolean;
}

export const AssetGrid: React.FC<AssetGridProps> = ({
  images,
  title,
  loading = false,
  onImageClick,
  showProjectInfo = false
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  if (loading) {
    return (
      <div>
        <h3 className="text-lg font-medium text-white mb-4">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[14px]">
          {[...Array(4)].map((_, index) => (
            <div
              key={index}
              className="aspect-square bg-[#1A1A1A] rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-medium text-white mb-4">{title}</h3>
        <div className="bg-[#1A1A1A] rounded-lg border border-[#333] p-8 text-center">
          <p className="text-gray-400">No {title.toLowerCase()} yet</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-medium text-white mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[14px]">
        {images.map((image) => (
          <div
            key={image.id}
            className="relative group cursor-pointer"
            onClick={() => onImageClick?.(image)}
          >
            <div
              className="relative rounded-lg overflow-hidden bg-[#1A1A1A]"
              style={{ aspectRatio: '1 / 1' }}
            >
              <img
                src={image.url}
                alt={showProjectInfo ? `From ${image.projectName}` : 'Asset image'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/fallback-image.jpg';
                }}
              />
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex justify-between items-end">
                    <div className="flex-1 min-w-0">
                      {showProjectInfo && image.projectName && (
                        <h3 className="font-medium text-white truncate text-sm">
                          {image.projectName}
                        </h3>
                      )}
                      <div className="flex items-center text-xs text-gray-300 mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDate(image.createdAt)}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadImage(image.url, `asset-${image.id}.jpg`);
                      }}
                      className="text-gray-400 hover:text-white transition-colors ml-2 p-1"
                      title="Download image"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};