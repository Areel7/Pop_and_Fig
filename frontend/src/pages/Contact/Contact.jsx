import { useState } from "react";
import emailjs from "@emailjs/browser";
import { CheckCircle2, Mail, MapPin, Phone } from "lucide-react";
import Container, { PageHeader } from "../../components/common/Container.jsx";
import Button from "../../components/common/Button.jsx";
import { Alert } from "../../components/common/Feedback.jsx";
import { Input, Textarea } from "../../components/forms/Field.jsx";
import { useSettings } from "../../hooks/useSettings.js";
import { useDocumentTitle } from "../../hooks/useCommon.js";

// EmailJS is used ONLY for this contact form. These are public, browser-safe identifiers.
const EMAILJS = {
    serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
    templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
    publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
};
const emailJsConfigured = Boolean(EMAILJS.serviceId && EMAILJS.templateId && EMAILJS.publicKey);

const EMPTY = { name: "", email: "", subject: "", message: "" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate = (v) => {
    const errors = {};
    if (v.name.trim().length < 2) errors.name = "Please enter your name";
    if (!EMAIL.test(v.email.trim())) errors.email = "Please enter a valid email address";
    if (v.subject.trim().length < 3) errors.subject = "Please add a subject";
    if (v.message.trim().length < 10) errors.message = "Your message should be at least 10 characters";
    return errors;
};

function Contact() {
    useDocumentTitle("Contact");
    const { settings } = useSettings();
    const store = settings.store || {};
    const [values, setValues] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState("idle"); // idle | sending | sent | error
    const [serverError, setServerError] = useState("");

    const set = (field) => (event) => setValues((v) => ({ ...v, [field]: event.target.value }));

    const submit = async (event) => {
        event.preventDefault();
        const nextErrors = validate(values);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) return;

        if (!emailJsConfigured) {
            setStatus("error");
            setServerError("The contact form is not configured yet. Please email us directly.");
            return;
        }

        setStatus("sending");
        setServerError("");
        try {
            await emailjs.send(
                EMAILJS.serviceId,
                EMAILJS.templateId,
                {
                    from_name: values.name.trim(),
                    from_email: values.email.trim(),
                    reply_to: values.email.trim(),
                    subject: values.subject.trim(),
                    message: values.message.trim(),
                    store_name: store.name || "Pop & Figs",
                },
                { publicKey: EMAILJS.publicKey }
            );
            setStatus("sent");
            setValues(EMPTY);
        } catch (error) {
            setStatus("error");
            setServerError(error?.text || "We couldn't send your message. Please try again in a moment.");
        }
    };

    return (
        <>
            <PageHeader label="GET IN TOUCH" title="Contact us" description="Questions about an order, a product or a special request? We'd love to hear from you." />
            <Container className="grid gap-12 py-12 sm:py-16 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
                <div className="space-y-8">
                    <p className="max-w-sm text-[15px] leading-7 text-neutral-600">
                        Send us a message and we'll get back to you as soon as possible — usually within one business day.
                    </p>
                    <ul className="space-y-5 text-sm">
                        {store.email && (
                            <li className="flex gap-4">
                                <Mail className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                                <div>
                                    <p className="font-semibold">Email</p>
                                    <a href={`mailto:${store.email}`} className="break-all text-neutral-600 underline-offset-4 hover:underline">
                                        {store.email}
                                    </a>
                                </div>
                            </li>
                        )}
                        {store.phone && (
                            <li className="flex gap-4">
                                <Phone className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                                <div>
                                    <p className="font-semibold">Phone</p>
                                    <a href={`tel:${store.phone.replace(/[^\d+]/g, "")}`} className="text-neutral-600 underline-offset-4 hover:underline">
                                        {store.phone}
                                    </a>
                                </div>
                            </li>
                        )}
                        {store.address && (
                            <li className="flex gap-4">
                                <MapPin className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                                <div>
                                    <p className="font-semibold">Address</p>
                                    <p className="text-neutral-600">{store.address}</p>
                                </div>
                            </li>
                        )}
                    </ul>
                </div>

                <div>
                    {status === "sent" ? (
                        <div className="flex flex-col items-start gap-4 border border-green-200 bg-green-50 p-8" role="status">
                            <CheckCircle2 className="size-8 text-green-700" aria-hidden="true" />
                            <h2 className="text-2xl font-medium tracking-tight">Message sent — thank you!</h2>
                            <p className="text-sm text-green-900">We've received your message and will reply to your email soon.</p>
                            <Button variant="outline" onClick={() => setStatus("idle")}>
                                Send another message
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
                            {status === "error" && (
                                <Alert tone="error" className="sm:col-span-2">
                                    {serverError}
                                </Alert>
                            )}
                            <Input label="Name" autoComplete="name" required value={values.name} onChange={set("name")} error={errors.name} maxLength={80} />
                            <Input label="Email" type="email" autoComplete="email" required value={values.email} onChange={set("email")} error={errors.email} maxLength={120} />
                            <Input label="Subject" required value={values.subject} onChange={set("subject")} error={errors.subject} maxLength={120} className="sm:col-span-2" />
                            <Textarea
                                label="Message"
                                required
                                rows={7}
                                value={values.message}
                                onChange={set("message")}
                                error={errors.message}
                                maxLength={3000}
                                className="sm:col-span-2"
                            />
                            <div className="sm:col-span-2">
                                <Button type="submit" size="lg" loading={status === "sending"} className="w-full sm:w-auto">
                                    {status === "sending" ? "Sending…" : "Send message"}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </Container>
        </>
    );
}

export default Contact;
