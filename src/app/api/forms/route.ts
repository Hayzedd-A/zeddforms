import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import Form from "@/models/Form";
import FormResponse from "@/models/FormResponse";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const forms = await Form.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .lean();

    // Get response counts for each form
    const formsWithCounts = await Promise.all(
      forms.map(async (form) => {
        const responseCount = await FormResponse.countDocuments({
          formId: form._id,
        });

        return {
          ...form,
          _count: {
            responses: responseCount,
          },
        };
      })
    );

    return NextResponse.json({ forms: formsWithCounts });
  } catch (error) {
    console.error("Error fetching forms:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      fields,
      settings,
      assignmentSolutions, // For assignment mode
    } = body;

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Form title is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Generate unique slug
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    let slug = baseSlug;
    let counter = 1;

    while (await Form.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Process and validate fields
    const processedFields = (fields || []).map((field: any, index: number) => ({
      id: field.id || `field-${Date.now()}-${index}`,
      type: field.type,
      label: field.label,
      required: field.required || false,
      placeholder: field.placeholder,
      description: field.description,
      options: field.options,
      allowMultiple: field.allowMultiple,
      allowOther: field.allowOther,
      maxRating: field.maxRating || 5,
      minScale: field.minScale || 1,
      maxScale: field.maxScale || 10,
      scaleLabels: field.scaleLabels,
      minValue: field.minValue,
      maxValue: field.maxValue,
      step: field.step || 1,
      minLength: field.minLength,
      maxLength: field.maxLength,
      pattern: field.pattern,
      minDate: field.minDate ? new Date(field.minDate) : undefined,
      maxDate: field.maxDate ? new Date(field.maxDate) : undefined,
      dateFormat: field.dateFormat || "MM/DD/YYYY",
      allowedFileTypes: field.allowedFileTypes,
      maxFileSize: field.maxFileSize || 10,
      maxFiles: field.maxFiles || 1,
      conditionalLogic: field.conditionalLogic,
      order: index,
      width: field.width || "full",
      validation: field.validation,
      // For assignment mode - store correct answers
      ...(settings?.assignmentMode &&
        field.correctAnswer && {
          correctAnswer: field.correctAnswer,
          explanation: field.explanation,
        }),
    }));

    // Process settings with defaults
    const processedSettings = {
      isPublic: settings?.isPublic !== undefined ? settings.isPublic : true,
      allowedEmails: Array.isArray(settings?.allowedEmails)
        ? settings.allowedEmails
        : [],
      limitOneResponse: settings?.limitOneResponse || false,
      limitByEmail: settings?.limitByEmail || false,
      limitByIP: settings?.limitByIP || false,
      openDate: settings?.openDate ? new Date(settings.openDate) : undefined,
      closeDate: settings?.closeDate ? new Date(settings.closeDate) : undefined,
      assignmentMode: settings?.assignmentMode || false,
      requireLogin: settings?.requireLogin || false,
      allowAnonymous:
        settings?.allowAnonymous !== undefined ? settings.allowAnonymous : true,
      collectEmail: settings?.collectEmail || false,
      collectIP: settings?.collectIP !== undefined ? settings.collectIP : true,
      showProgressBar:
        settings?.showProgressBar !== undefined
          ? settings.showProgressBar
          : true,
      allowSaveDraft: settings?.allowSaveDraft || false,
      customTheme: settings?.customTheme || {},
      notifications: {
        emailOnSubmission: settings?.notifications?.emailOnSubmission || false,
        notificationEmails: Array.isArray(
          settings?.notifications?.notificationEmails
        )
          ? settings.notifications.notificationEmails
          : [],
      },
      redirectUrl: settings?.redirectUrl,
      customSuccessMessage: settings?.customSuccessMessage,
    };

    const form = await Form.create({
      title,
      description,
      slug,
      userId: session.user.id,
      fields: processedFields,
      settings: processedSettings,
    });

    return NextResponse.json({ form }, { status: 201 });
  } catch (error) {
    console.error("Error creating form:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      return NextResponse.json(
        { error: "Validation error", details: error.message },
        { status: 400 }
      );
    }

    // Handle duplicate slug error
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Form with this title already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
