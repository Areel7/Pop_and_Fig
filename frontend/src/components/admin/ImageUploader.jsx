import { useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Link2, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { useUploadImagesMutation } from "../../redux/api/adminApi.js";
import { getErrorMessage } from "../../redux/api/apiSlice.js";
import { resolveImageUrl } from "../../utils/format.js";
import Spinner from "../common/Spinner.jsx";

const isValidUrl = (value) => /^https?:\/\/\S+$/i.test(value) || /^\/uploads\/\S+$/.test(value);

/**
 * Manages a list of image URLs: upload files (stored via the backend in Cloudinary or /uploads)
 * or paste an https URL. `multiple={false}` keeps a single image.
 */
function ImageUploader({ value = [], onChange, multiple = true, max = 8, label = "Images", hint }) {
    const inputId = useId();
    const fileInput = useRef(null);
    const [url, setUrl] = useState("");
    const [upload, { isLoading }] = useUploadImagesMutation();

    const limit = multiple ? max : 1;
    const setImages = (next) => onChange(multiple ? next.slice(0, limit) : next.slice(-1));

    const handleFiles = async (files) => {
        if (!files?.length) return;
        const selected = [...files].slice(0, multiple ? limit - value.length || 1 : 1);
        try {
            const { urls } = await upload(selected).unwrap();
            setImages([...(multiple ? value : []), ...urls]);
            toast.success(`${urls.length} image${urls.length === 1 ? "" : "s"} uploaded`);
        } catch (error) {
            toast.error(getErrorMessage(error, "Upload failed"));
        } finally {
            if (fileInput.current) fileInput.current.value = "";
        }
    };

    const addUrl = () => {
        const trimmed = url.trim();
        if (!isValidUrl(trimmed)) {
            toast.error("Enter a full image URL starting with https://");
            return;
        }
        setImages([...(multiple ? value : []), trimmed]);
        setUrl("");
    };

    const move = (index, delta) => {
        const next = [...value];
        const [item] = next.splice(index, 1);
        next.splice(index + delta, 0, item);
        onChange(next);
    };

    return (
        <div>
            <p className="mb-1.5 text-sm font-medium text-neutral-800">{label}</p>
            {value.length > 0 && (
                <ul className="mb-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {value.map((src, index) => (
                        <li key={`${src}-${index}`} className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
                            <img src={resolveImageUrl(src)} alt={`Image ${index + 1}`} className="size-full object-cover" />
                            {index === 0 && multiple && (
                                <span className="absolute top-1.5 left-1.5 rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">Main</span>
                            )}
                            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                                {multiple && index > 0 && (
                                    <button type="button" onClick={() => move(index, -1)} className="rounded bg-white/90 p-1 text-neutral-800" aria-label={`Move image ${index + 1} earlier`}>
                                        <ArrowLeft className="size-3.5" aria-hidden="true" />
                                    </button>
                                )}
                                {multiple && index < value.length - 1 && (
                                    <button type="button" onClick={() => move(index, 1)} className="rounded bg-white/90 p-1 text-neutral-800" aria-label={`Move image ${index + 1} later`}>
                                        <ArrowRight className="size-3.5" aria-hidden="true" />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => onChange(value.filter((_, i) => i !== index))}
                                    className="rounded bg-white/90 p-1 text-red-600"
                                    aria-label={`Remove image ${index + 1}`}
                                >
                                    <Trash2 className="size-3.5" aria-hidden="true" />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {value.length < limit || !multiple ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                    <label
                        htmlFor={inputId}
                        className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-400 px-4 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:bg-neutral-50"
                    >
                        {isLoading ? <Spinner className="size-4" /> : <ImagePlus className="size-4" aria-hidden="true" />}
                        {isLoading ? "Uploading…" : multiple ? "Upload images" : value.length ? "Replace image" : "Upload image"}
                    </label>
                    <input
                        id={inputId}
                        ref={fileInput}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                        multiple={multiple}
                        className="sr-only"
                        disabled={isLoading}
                        onChange={(e) => handleFiles(e.target.files)}
                    />
                    <div className="flex min-w-0 flex-1 rounded-lg border border-neutral-300 focus-within:border-neutral-900">
                        <span className="flex items-center pl-3 text-neutral-400">
                            <Link2 className="size-4" aria-hidden="true" />
                        </span>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    addUrl();
                                }
                            }}
                            placeholder="…or paste an image URL"
                            aria-label="Image URL"
                            className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm outline-none"
                        />
                        <button type="button" onClick={addUrl} className="px-3 text-sm font-medium text-neutral-700 hover:text-neutral-950">
                            Add
                        </button>
                    </div>
                </div>
            ) : null}
            <p className="mt-1.5 text-xs text-neutral-500">{hint || `JPEG, PNG, WebP, GIF or AVIF up to 5MB${multiple ? ` · up to ${limit} images` : ""}.`}</p>
        </div>
    );
}

export default ImageUploader;
