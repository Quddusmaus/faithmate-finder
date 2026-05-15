import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, ExternalLink, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { stages, furtherReading } from "@/data/writings";

const Writings = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <Helmet>
        <title>From the Writings — Uniting Hearts</title>
        <meta
          name="description"
          content="A curated collection of Baháʼí writings on love, marriage, and relationships — guidance for knowing yourself, seeking well, uniting, and building together."
        />
        <link rel="canonical" href="https://unityhearts.app/writings" />
        <meta property="og:title" content="From the Writings — Uniting Hearts" />
        <meta
          property="og:description"
          content="Baháʼí teachings on love & marriage."
        />
        <meta property="og:url" content="https://unityhearts.app/writings" />
      </Helmet>

      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/profiles" aria-label="Back to profiles">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">From the Writings</h1>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Hero */}
        <section className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Heart className="h-7 w-7 text-primary" fill="currentColor" />
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            From the Writings
          </h2>
          <p className="mt-2 text-base sm:text-lg text-muted-foreground">
            Baháʼí teachings on love & marriage
          </p>
        </section>

        {/* Stages */}
        <Accordion
          type="multiple"
          defaultValue={stages.map((s) => s.id)}
          className="space-y-4"
        >
          {stages.map((stage) => (
            <AccordionItem
              key={stage.id}
              value={stage.id}
              className="rounded-2xl border bg-card shadow-sm"
            >
              <AccordionTrigger className="px-5 py-4 hover:no-underline">
                <div className="flex flex-col items-start text-left">
                  <span className="font-serif text-xl sm:text-2xl font-semibold text-foreground">
                    {stage.title}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {stage.subtitle}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5">
                <div className="space-y-4">
                  {stage.passages.map((passage) => (
                    <Card
                      key={passage.id}
                      className="border-primary/10 bg-gradient-to-b from-card to-muted/30"
                    >
                      <CardContent className="pt-6">
                        <blockquote className="font-serif text-lg leading-relaxed text-foreground">
                          <span className="text-primary/40 mr-1">“</span>
                          {passage.quote}
                          <span className="text-primary/40 ml-1">”</span>
                        </blockquote>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground/80">
                              {passage.author}
                            </span>
                            {passage.source && passage.source !== "—" && (
                              <>
                                <span aria-hidden="true"> · </span>
                                <span className="italic">{passage.source}</span>
                              </>
                            )}
                          </p>
                          <a
                            href={passage.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            Read on bahai.org
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Further Reading */}
        <section className="mt-12">
          <h3 className="font-serif text-2xl font-semibold text-foreground">
            Further Reading
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Articles & reflections from BahaiTeachings.org
          </p>
          <ul className="mt-4 space-y-4">
            {furtherReading.map((item) => (
              <li key={item.url}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                >
                  {item.title}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                {item.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Back */}
        <div className="mt-12 text-center">
          <Button asChild variant="outline">
            <Link to="/profiles">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Profiles
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Writings;
