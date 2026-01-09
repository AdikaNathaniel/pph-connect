import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { submitPublicApplication } from '@/services/publicApplicationService';

const languages = ['English', 'Spanish', 'Tagalog', 'Portuguese', 'Hindi', 'French', 'Other'];
const domains = ['STEM', 'Legal', 'Creative', 'Medical', 'Finance', 'Operations', 'Other'];
const educationOptions = ["Bachelor's", "Master's", 'PhD', 'Other'];
const referralOptions = ['Friend', 'Social media', 'Job board', 'Google search', 'University partner', 'Other'];

export const PublicApplicationPage: React.FC = () => {
  const [formState, setFormState] = useState({
    fullName: '',
    email: '',
    country: '',
    primaryLanguage: '',
    coverLetter: '',
    referralSource: '',
    resumeFileName: '',
    education: '',
  });
  const [languagesSelected, setLanguagesSelected] = useState<string[]>([]);
  const [domainsSelected, setDomainsSelected] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCheckboxChange = (list: string[], setter: (values: string[]) => void, value: string) => {
    if (list.includes(value)) {
      setter(list.filter((entry) => entry !== value));
    } else {
      setter([...list, value]);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.fullName.trim() || !formState.email.trim()) {
      toast.error('Full name and email are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await submitPublicApplication({
        fullName: formState.fullName.trim(),
        email: formState.email.trim(),
        country: formState.country.trim(),
        primaryLanguage: formState.primaryLanguage,
        languages: languagesSelected,
        education: formState.education,
        domains: domainsSelected,
        resumeFileName: formState.resumeFileName,
        coverLetter: formState.coverLetter,
        referralSource: formState.referralSource,
      });
      toast.success('Application submitted! We will reach out via email if selected.');
      setFormState({
        fullName: '',
        email: '',
        country: '',
        primaryLanguage: '',
        coverLetter: '',
        referralSource: '',
        resumeFileName: '',
        education: '',
      });
      setLanguagesSelected([]);
      setDomainsSelected([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit application';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" data-testid="public-application-page">
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Apply to join the network</p>
          <h1 className="text-3xl font-bold">Public application</h1>
          <p className="text-sm text-muted-foreground">
            Share your background and we will follow up when projects match your profile.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Candidate information</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit} data-testid="public-application-form">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="app-full-name">Full Name</Label>
                  <Input
                    id="app-full-name"
                    value={formState.fullName}
                    onChange={(event) => setFormState({ ...formState, fullName: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="app-email">Email</Label>
                  <Input
                    id="app-email"
                    type="email"
                    value={formState.email}
                    onChange={(event) => setFormState({ ...formState, email: event.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="app-country">Country of Residence</Label>
                  <Input
                    id="app-country"
                    value={formState.country}
                    onChange={(event) => setFormState({ ...formState, country: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Primary Language/Locale</Label>
                  <Select
                    value={formState.primaryLanguage}
                    onValueChange={(value) => setFormState({ ...formState, primaryLanguage: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((language) => (
                        <SelectItem key={language} value={language}>
                          {language}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>All Languages (select all that apply)</Label>
                <div className="grid gap-2 md:grid-cols-2">
                  {languages.map((language) => (
                    <label key={language} className="flex items-center gap-2 text-sm text-foreground">
                      <Checkbox
                        checked={languagesSelected.includes(language)}
                        onCheckedChange={() => handleCheckboxChange(languagesSelected, setLanguagesSelected, language)}
                      />
                      {language}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Educational Background</Label>
                  <Select
                    value={formState.education}
                    onValueChange={(value) => setFormState({ ...formState, education: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select highest education" />
                    </SelectTrigger>
                    <SelectContent>
                      {educationOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Domains of Expertise</Label>
                  <div className="grid gap-2 md:grid-cols-2">
                    {domains.map((domain) => (
                      <label key={domain} className="flex items-center gap-2 text-sm text-foreground">
                        <Checkbox
                          checked={domainsSelected.includes(domain)}
                          onCheckedChange={() => handleCheckboxChange(domainsSelected, setDomainsSelected, domain)}
                        />
                        {domain}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="app-resume">Resume/CV upload</Label>
                  <Input
                    id="app-resume"
                    type="file"
                    onChange={(event) =>
                      setFormState({
                        ...formState,
                        resumeFileName: event.target.files?.[0]?.name ?? '',
                      })
                    }
                  />
                  {formState.resumeFileName ? (
                    <p className="text-xs text-muted-foreground">Selected: {formState.resumeFileName}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>How did you hear about us?</Label>
                  <Select
                    value={formState.referralSource}
                    onValueChange={(value) => setFormState({ ...formState, referralSource: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an option" />
                    </SelectTrigger>
                    <SelectContent>
                      {referralOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="app-cover-letter">Cover letter</Label>
                <Textarea
                  id="app-cover-letter"
                  rows={5}
                  value={formState.coverLetter}
                  onChange={(event) => setFormState({ ...formState, coverLetter: event.target.value })}
                />
              </div>

              <div
                className="rounded-md border border-dashed bg-muted/30 px-4 py-3 text-xs text-muted-foreground"
                data-testid="public-application-captcha"
              >
                This form is protected by reCAPTCHA to prevent spam. Submission implies agreement with our privacy
                policy.
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting…' : 'Submit application'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicApplicationPage;
