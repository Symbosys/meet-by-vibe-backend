import { prisma } from "../../lib/prisma.js";
import { ErrorResponse } from "../../utils/response.util.js";
import { statusCode } from "../../types/types.js";
import type {
  CreateEventInput,
  UpdateEventInput,
  QueryEventsInput,
  RsvpEventInput,
} from "./event.validation.js";

export class EventService {
  /**
   * List events with dynamic counts (attendeesCount, lookingForPartnerCount, avatars, isJoined, isFavorite)
   */
  async getEvents(params: QueryEventsInput, currentUserId?: string) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.status === "ALL") {
      // Return all events including drafts/inactive for admin overview
    } else if (params.status) {
      where.status = params.status;
      where.isActive = true;
    } else {
      where.isActive = true;
      where.status = { notIn: ["DRAFT", "CANCELLED"] };
    }

    if (params.isFeatured !== undefined) {
      where.isFeatured = params.isFeatured;
    }

    if (params.city) {
      where.city = { contains: params.city, mode: "insensitive" };
    }

    if (params.state) {
      where.state = { contains: params.state, mode: "insensitive" };
    }

    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: "insensitive" } },
        { venue: { contains: params.search, mode: "insensitive" } },
        { city: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isFeatured: "desc" }, { eventDate: "asc" }],
        include: {
          attendees: {
            where: { status: "GOING" },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                },
              },
            },
          },
          favoritedBy: currentUserId
            ? {
                where: { userId: currentUserId },
                select: { userId: true },
              }
            : false,
          organizer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.event.count({ where }),
    ]);

    const formattedEvents = events.map((event) => {
      const attendeesCount = event.attendees.length;
      const lookingForPartnerCount = event.attendees.filter((a) => a.lookingForPartner).length;
      const attendeeAvatars = event.attendees
        .map((a) => a.user.avatarUrl)
        .filter((url): url is string => Boolean(url))
        .slice(0, 4);

      const isJoined = currentUserId
        ? event.attendees.some((a) => a.userId === currentUserId)
        : false;

      const isFavorite = currentUserId && event.favoritedBy
        ? event.favoritedBy.length > 0
        : false;

      // Format date string for UI
      const dateStr = event.eventDate
        ? new Date(event.eventDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "";

      return {
        id: event.id,
        title: event.title,
        slug: event.slug,
        description: event.description,
        imageUrl: event.imageUrl,
        galleryImages: event.galleryImages,
        date: dateStr,
        rawDate: event.eventDate,
        time: event.startTime,
        endTime: event.endTime,
        venue: event.venue,
        address: event.address,
        city: event.city,
        state: event.state,
        pincode: event.pincode,
        pricePerPass: event.pricePerPass ? Number(event.pricePerPass) : 0,
        totalCapacity: event.totalCapacity,
        isFeatured: event.isFeatured,
        status: event.status,
        attendeesCount,
        lookingForPartnerCount,
        attendeeAvatars,
        isJoined,
        isFavorite,
        organizer: event.organizer,
      };
    });

    return {
      events: formattedEvents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single event details by ID or Slug
   */
  async getEventById(id: string, currentUserId?: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const event = await prisma.event.findFirst({
      where: isUuid ? { id } : { slug: id },
      include: {
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                gender: true,
                skillLevel: true,
              },
            },
          },
        },
        favoritedBy: currentUserId
          ? {
              where: { userId: currentUserId },
              select: { userId: true },
            }
          : false,
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!event) {
      throw new ErrorResponse("Event not found", statusCode.Not_Found);
    }

    const goingAttendees = event.attendees.filter((a) => a.status === "GOING");
    const attendeesCount = goingAttendees.length;
    const lookingForPartnerCount = goingAttendees.filter((a) => a.lookingForPartner).length;
    const attendeeAvatars = goingAttendees
      .map((a) => a.user.avatarUrl)
      .filter((url): url is string => Boolean(url))
      .slice(0, 6);

    const isJoined = currentUserId
      ? event.attendees.some((a) => a.userId === currentUserId && a.status === "GOING")
      : false;

    const isFavorite = currentUserId && event.favoritedBy
      ? event.favoritedBy.length > 0
      : false;

    const dateStr = event.eventDate
      ? new Date(event.eventDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "";

    return {
      id: event.id,
      title: event.title,
      slug: event.slug,
      description: event.description,
      imageUrl: event.imageUrl,
      galleryImages: event.galleryImages,
      date: dateStr,
      rawDate: event.eventDate,
      time: event.startTime,
      endTime: event.endTime,
      venue: event.venue,
      address: event.address,
      city: event.city,
      state: event.state,
      pincode: event.pincode,
      pricePerPass: event.pricePerPass ? Number(event.pricePerPass) : 0,
      totalCapacity: event.totalCapacity,
      isFeatured: event.isFeatured,
      status: event.status,
      dressCode: event.dressCode,
      rules: event.rules,
      attendeesCount,
      lookingForPartnerCount,
      attendeeAvatars,
      isJoined,
      isFavorite,
      organizer: event.organizer,
      attendees: goingAttendees.map((a) => ({
        id: a.id,
        user: a.user,
        lookingForPartner: a.lookingForPartner,
        joinedAt: a.joinedAt,
      })),
    };
  }

  /**
   * Create a new event
   */
  async createEvent(input: CreateEventInput, creatorId?: string) {
    const slug = input.slug || input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const event = await prisma.event.create({
      data: {
        title: input.title,
        slug: `${slug}-${Date.now().toString(36)}`,
        description: input.description,
        imageUrl: input.imageUrl,
        galleryImages: input.galleryImages,
        eventDate: new Date(input.eventDate),
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        startTime: input.startTime,
        endTime: input.endTime,
        venue: input.venue,
        address: input.address,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        latitude: input.latitude,
        longitude: input.longitude,
        pricePerPass: input.pricePerPass,
        totalCapacity: input.totalCapacity,
        isFeatured: input.isFeatured,
        isActive: input.isActive,
        status: input.status,
        organizerId: input.organizerId || creatorId,
        organizerName: input.organizerName,
        organizerContact: input.organizerContact,
        dressCode: input.dressCode,
        rules: input.rules,
      },
    });

    return event;
  }

  /**
   * Update an existing event
   */
  async updateEvent(id: string, input: UpdateEventInput) {
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      throw new ErrorResponse("Event not found", statusCode.Not_Found);
    }

    const updateData: any = { ...input };
    if (input.eventDate) {
      updateData.eventDate = new Date(input.eventDate);
    }
    if (input.endDate) {
      updateData.endDate = new Date(input.endDate);
    }

    const updated = await prisma.event.update({
      where: { id },
      data: updateData,
    });

    return updated;
  }

  /**
   * Delete / Deactivate event
   */
  async deleteEvent(id: string) {
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      throw new ErrorResponse("Event not found", statusCode.Not_Found);
    }

    await prisma.event.delete({ where: { id } });
    return { success: true, message: "Event deleted successfully" };
  }

  /**
   * RSVP to an event (Join / Leave / Toggle Looking for Partner)
   */
  async toggleRsvp(eventId: string, input: RsvpEventInput) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new ErrorResponse("Event not found", statusCode.Not_Found);
    }

    const existingAttendee = await prisma.eventAttendee.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: input.userId,
        },
      },
    });

    if (existingAttendee) {
      // If already joined with same status, remove/toggle off
      if (existingAttendee.status === input.status && !input.lookingForPartner && existingAttendee.status === "GOING") {
        await prisma.eventAttendee.delete({
          where: { id: existingAttendee.id },
        });
        return { isJoined: false, lookingForPartner: false, message: "Left event successfully" };
      }

      // Update attendance status & partner search flag
      const updated = await prisma.eventAttendee.update({
        where: { id: existingAttendee.id },
        data: {
          status: input.status,
          lookingForPartner: input.lookingForPartner,
          passCount: input.passCount || existingAttendee.passCount,
          notes: input.notes,
        },
      });

      return {
        isJoined: updated.status === "GOING",
        lookingForPartner: updated.lookingForPartner,
        message: "RSVP updated successfully",
      };
    }

    // Create new attendee record
    const created = await prisma.eventAttendee.create({
      data: {
        eventId,
        userId: input.userId,
        status: input.status,
        lookingForPartner: input.lookingForPartner,
        passCount: input.passCount,
        notes: input.notes,
      },
    });

    return {
      isJoined: created.status === "GOING",
      lookingForPartner: created.lookingForPartner,
      message: "RSVP confirmed successfully",
    };
  }

  /**
   * Toggle bookmark/favorite on an event
   */
  async toggleFavorite(eventId: string, userId: string) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new ErrorResponse("Event not found", statusCode.Not_Found);
    }

    const existingFav = await prisma.eventFavorite.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    if (existingFav) {
      await prisma.eventFavorite.delete({
        where: { id: existingFav.id },
      });
      return { isFavorite: false, message: "Removed from favorites" };
    }

    await prisma.eventFavorite.create({
      data: {
        eventId,
        userId,
      },
    });

    return { isFavorite: true, message: "Added to favorites" };
  }
}

export const eventService = new EventService();
